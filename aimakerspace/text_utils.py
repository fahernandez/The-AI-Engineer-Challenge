import os
from typing import List
from pypdf import PdfReader
import pandas as pd
import io


class TextFileLoader:
    def __init__(self, path: str, encoding: str = "utf-8"):
        self.documents = []
        self.path = path
        self.encoding = encoding

    def load(self):
        if os.path.isdir(self.path):
            self.load_directory()
        elif os.path.isfile(self.path) and self.path.endswith(".txt"):
            self.load_file()
        else:
            raise ValueError(
                "Provided path is neither a valid directory nor a .txt file."
            )

    def load_file(self):
        with open(self.path, "r", encoding=self.encoding) as f:
            self.documents.append(f.read())

    def load_directory(self):
        for root, _, files in os.walk(self.path):
            for file in files:
                if file.endswith(".txt"):
                    with open(
                        os.path.join(root, file), "r", encoding=self.encoding
                    ) as f:
                        self.documents.append(f.read())

    def load_documents(self):
        self.load()
        return self.documents


class CharacterTextSplitter:
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ):
        assert (
            chunk_size > chunk_overlap
        ), "Chunk size must be greater than chunk overlap"

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split(self, text: str) -> List[str]:
        chunks = []
        for i in range(0, len(text), self.chunk_size - self.chunk_overlap):
            chunks.append(text[i : i + self.chunk_size])
        return chunks

    def split_texts(self, texts: List[str]) -> List[str]:
        chunks = []
        for text in texts:
            chunks.extend(self.split(text))
        return chunks


class PDFLoader:
    def __init__(self, path: str):
        self.documents = []
        self.path = path
        print(f"PDFLoader initialized with path: {self.path}")

    def load(self):
        print(f"Loading PDF from path: {self.path}")
        print(f"Path exists: {os.path.exists(self.path)}")
        print(f"Is file: {os.path.isfile(self.path)}")
        print(f"Is directory: {os.path.isdir(self.path)}")
        print(f"File permissions: {oct(os.stat(self.path).st_mode)[-3:]}")
        
        try:
            # Try to open the file first to verify access
            with open(self.path, 'rb') as test_file:
                pass
            
            # If we can open it, proceed with loading
            self.load_file()
            
        except IOError as e:
            raise ValueError(f"Cannot access file at '{self.path}': {str(e)}")
        except Exception as e:
            raise ValueError(f"Error processing file at '{self.path}': {str(e)}")

    def load_file(self):
        with open(self.path, 'rb') as file:
            # Create PDF reader object
            pdf_reader = PdfReader(file)
            
            # Extract text from each page
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            self.documents.append(text)

    def load_directory(self):
        for root, _, files in os.walk(self.path):
            for file in files:
                if file.lower().endswith('.pdf'):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'rb') as f:
                        pdf_reader = PdfReader(f)
                        
                        # Extract text from each page
                        text = ""
                        for page in pdf_reader.pages:
                            text += page.extract_text() + "\n"
                        
                        self.documents.append(text)

    def load_documents(self):
        self.load()
        return self.documents


class CSVLoader:
    def __init__(self, path: str, encoding: str = "utf-8"):
        self.documents = []
        self.path = path
        self.encoding = encoding
        print(f"CSVLoader initialized with path: {self.path}")

    def load(self):
        print(f"Loading CSV from path: {self.path}")
        print(f"Path exists: {os.path.exists(self.path)}")
        print(f"Is file: {os.path.isfile(self.path)}")
        
        try:
            # Try to open and validate the file first
            with open(self.path, 'r', encoding=self.encoding) as test_file:
                # Read a small sample to validate it's a CSV
                sample = test_file.read(1024)
                if not sample.strip():
                    raise ValueError("File appears to be empty")
            
            # If we can open it, proceed with loading
            self.load_file()
            
        except IOError as e:
            raise ValueError(f"Cannot access file at '{self.path}': {str(e)}")
        except Exception as e:
            raise ValueError(f"Error processing CSV file at '{self.path}': {str(e)}")

    def load_file(self):
        try:
            # Read CSV file with pandas
            df = pd.read_csv(self.path, encoding=self.encoding)
            
            # Convert DataFrame to text representation
            # We'll create a structured text format that includes headers and data
            text_content = self._dataframe_to_text(df)
            
            self.documents.append(text_content)
            
        except pd.errors.EmptyDataError:
            raise ValueError("CSV file is empty")
        except pd.errors.ParserError as e:
            raise ValueError(f"Error parsing CSV file: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error reading CSV file: {str(e)}")

    def _dataframe_to_text(self, df: pd.DataFrame) -> str:
        """
        Convert DataFrame to a text format suitable for RAG processing.
        Creates a structured representation that includes metadata about the dataset.
        """
        text_parts = []
        
        # Add dataset metadata
        text_parts.append(f"Dataset Information:")
        text_parts.append(f"- Number of rows: {len(df)}")
        text_parts.append(f"- Number of columns: {len(df.columns)}")
        text_parts.append(f"- Column names: {', '.join(df.columns.tolist())}")
        text_parts.append("")
        
        # Add column descriptions with data types and sample values
        text_parts.append("Column Details:")
        for col in df.columns:
            col_info = []
            col_info.append(f"Column: {col}")
            col_info.append(f"  - Data type: {df[col].dtype}")
            col_info.append(f"  - Non-null count: {df[col].notna().sum()}")
            
            # Add sample values (first 3 unique non-null values)
            sample_values = df[col].dropna().unique()[:3]
            if len(sample_values) > 0:
                sample_str = ", ".join([str(val) for val in sample_values])
                col_info.append(f"  - Sample values: {sample_str}")
            
            # Add basic statistics for numeric columns
            if pd.api.types.is_numeric_dtype(df[col]):
                col_info.append(f"  - Min: {df[col].min()}")
                col_info.append(f"  - Max: {df[col].max()}")
                col_info.append(f"  - Mean: {df[col].mean():.2f}")
            
            text_parts.extend(col_info)
            text_parts.append("")
        
        # Add sample rows
        text_parts.append("Sample Data (first 10 rows):")
        text_parts.append("-" * 50)
        
        # Convert first 10 rows to readable format
        sample_df = df.head(10)
        for idx, row in sample_df.iterrows():
            row_text = f"Row {idx + 1}:"
            for col in df.columns:
                row_text += f"\n  {col}: {row[col]}"
            text_parts.append(row_text)
            text_parts.append("")
        
        # If there are many rows, add summary statistics
        if len(df) > 10:
            text_parts.append(f"Note: This dataset contains {len(df)} total rows. Above are the first 10 rows.")
            text_parts.append("")
            
            # Add summary statistics for numeric columns
            numeric_cols = df.select_dtypes(include=[pd.api.types.is_numeric_dtype]).columns
            if len(numeric_cols) > 0:
                text_parts.append("Numeric Column Summary Statistics:")
                text_parts.append("-" * 50)
                for col in numeric_cols:
                    text_parts.append(f"{col}:")
                    text_parts.append(f"  - Count: {df[col].count()}")
                    text_parts.append(f"  - Mean: {df[col].mean():.2f}")
                    text_parts.append(f"  - Std: {df[col].std():.2f}")
                    text_parts.append(f"  - Min: {df[col].min()}")
                    text_parts.append(f"  - 25%: {df[col].quantile(0.25):.2f}")
                    text_parts.append(f"  - 50%: {df[col].median():.2f}")
                    text_parts.append(f"  - 75%: {df[col].quantile(0.75):.2f}")
                    text_parts.append(f"  - Max: {df[col].max()}")
                    text_parts.append("")
        
        return "\n".join(text_parts)

    def load_directory(self):
        """Load all CSV files from a directory"""
        for root, _, files in os.walk(self.path):
            for file in files:
                if file.lower().endswith('.csv'):
                    file_path = os.path.join(root, file)
                    try:
                        df = pd.read_csv(file_path, encoding=self.encoding)
                        text_content = self._dataframe_to_text(df)
                        # Add filename to the beginning of the content
                        text_content = f"File: {file}\n\n{text_content}"
                        self.documents.append(text_content)
                    except Exception as e:
                        print(f"Error loading {file_path}: {str(e)}")
                        continue

    def load_documents(self):
        self.load()
        return self.documents


if __name__ == "__main__":
    loader = TextFileLoader("data/KingLear.txt")
    loader.load()
    splitter = CharacterTextSplitter()
    chunks = splitter.split_texts(loader.documents)
    print(len(chunks))
    print(chunks[0])
    print("--------")
    print(chunks[1])
    print("--------")
    print(chunks[-2])
    print("--------")
    print(chunks[-1])
