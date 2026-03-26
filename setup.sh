#!/bin/bash
# Client Go Bag Setup Script

set -e

echo "🛠️  Client Go Bag Setup"
echo "===================="
echo ""

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
echo "✓ Python $PYTHON_VERSION detected"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your ANTHROPIC_API_KEY"
else
    echo "✓ .env already exists"
fi

# Create client_outputs directory
if [ ! -d "client_outputs" ]; then
    echo "📁 Creating client_outputs directory..."
    mkdir -p client_outputs
else
    echo "✓ client_outputs directory already exists"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Edit .env and add your ANTHROPIC_API_KEY"
echo "2. Run: python go_bag.py <client_url>"
echo ""
echo "Example:"
echo "  python go_bag.py https://example.com"
echo ""
