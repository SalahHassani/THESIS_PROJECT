# Use an official lightweight Python image
FROM python:3.9

# Set the working directory
WORKDIR /app

# Install required Python libraries
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the application port
EXPOSE 8080

# Set environment variable for model path
ENV MODEL_PATH=/weights/v1-5-pruned-emaonly.ckpt

# Ensure the weights directory exists (for local testing)
RUN mkdir -p /weights

# Start the application
CMD ["python", "server2.py"]
