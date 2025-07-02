# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import tempfile
import asyncio
from typing import Optional, List

# Import aimakerspace components for RAG functionality
import sys
sys.path.append('..')  # Add parent directory to path to import aimakerspace
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.openai_utils.embedding import EmbeddingModel
from aimakerspace.openai_utils.chatmodel import ChatOpenAI
from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter

# Initialize FastAPI application with a title
app = FastAPI(title="PDF RAG Chat API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Global variables to store the vector database and document metadata
vector_db = None
indexed_documents = []
current_api_key = None

# Define the data model for chunking settings
class ChunkSettings(BaseModel):
    chunk_size: int = 1000         # Size of each text chunk
    chunk_overlap: int = 200       # Overlap between chunks

# Define the data model for retrieval settings
class RetrievalSettings(BaseModel):
    k: int = 3                     # Number of chunks to retrieve

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4o-mini"  # Optional model selection with default
    api_key: str          # OpenAI API key for authentication

# Define the data model for RAG chat requests
class RAGChatRequest(BaseModel):
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4o-mini"  # Optional model selection with default
    api_key: str          # OpenAI API key for authentication
    use_rag: bool = True   # Whether to use RAG functionality
    retrieval_settings: Optional[RetrievalSettings] = RetrievalSettings()  # Settings for retrieval

# Define the data model for PDF indexing requests
class IndexRequest(BaseModel):
    api_key: str          # OpenAI API key for authentication
    chunk_settings: Optional[ChunkSettings] = ChunkSettings()  # Settings for chunking

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=request.api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "developer", "content": request.developer_message},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=str(e))

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# PDF Upload endpoint
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file for processing
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Store file info globally (in production, use a database)
        global indexed_documents
        indexed_documents = [{
            "filename": file.filename,
            "path": temp_path,
            "size": len(content),
            "status": "uploaded"
        }]
        
        return {
            "message": "PDF uploaded successfully",
            "filename": file.filename,
            "size": len(content)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# PDF Indexing endpoint
@app.post("/api/index-pdf")
async def index_pdf(request: IndexRequest):
    """
    Index the uploaded PDF using embeddings
    """
    global vector_db, indexed_documents, current_api_key
    
    if not indexed_documents:
        raise HTTPException(status_code=400, detail="No PDF uploaded")
    
    try:
        current_api_key = request.api_key
        
        # Set OpenAI API key in environment
        os.environ["OPENAI_API_KEY"] = request.api_key
        
        # Load and process PDF
        pdf_path = indexed_documents[0]["path"]
        pdf_loader = PDFLoader(pdf_path)
        documents = pdf_loader.load_documents()
        
        if not documents:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Split documents into chunks
        text_splitter = CharacterTextSplitter(chunk_size=request.chunk_settings.chunk_size, chunk_overlap=request.chunk_settings.chunk_overlap)
        chunks = text_splitter.split_texts(documents)
        
        # Create embeddings and build vector database
        embedding_model = EmbeddingModel()
        vector_db = VectorDatabase(embedding_model)
        
        # Build vector database asynchronously
        vector_db = await vector_db.abuild_from_list(chunks)
        
        # Update document status
        indexed_documents[0]["status"] = "indexed"
        indexed_documents[0]["chunks"] = len(chunks)
        
        return {
            "message": "PDF indexed successfully",
            "chunks_created": len(chunks),
            "filename": indexed_documents[0]["filename"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error indexing PDF: {str(e)}")

# RAG Chat endpoint
@app.post("/api/rag-chat")
async def rag_chat(request: RAGChatRequest):
    """
    Chat with the indexed PDF using RAG
    """
    global vector_db, current_api_key
    
    if not vector_db:
        raise HTTPException(status_code=400, detail="No PDF indexed. Please upload and index a PDF first.")
    
    try:
        # Set OpenAI API key in environment
        os.environ["OPENAI_API_KEY"] = request.api_key
        current_api_key = request.api_key
        
        async def generate():
            if request.use_rag:
                # Retrieve relevant chunks using RAG
                relevant_chunks = vector_db.search_by_text(
                    request.user_message, 
                    k=request.retrieval_settings.k, 
                    return_as_text=True
                )
                
                # Create context from retrieved chunks
                context = "\n\n".join(relevant_chunks)
                
                # Create RAG prompt
                rag_prompt = f"""Based on the following context from the document, answer the user's question. If the answer is not in the context, say so.

Context:
{context}

Question: {request.user_message}

Answer:"""
            else:
                rag_prompt = request.user_message
            
            # Initialize OpenAI client and create streaming response
            client = OpenAI(api_key=request.api_key)
            
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context."},
                    {"role": "user", "content": rag_prompt}
                ],
                stream=True
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in RAG chat: {str(e)}")

# Get document status endpoint
@app.get("/api/document-status")
async def get_document_status():
    """
    Get the status of uploaded and indexed documents
    """
    global indexed_documents, vector_db
    
    return {
        "documents": indexed_documents,
        "vector_db_ready": vector_db is not None
    }

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
