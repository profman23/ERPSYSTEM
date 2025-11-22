#!/bin/bash
# Build script placeholder for Phase 1
# Future: Add build steps for production deployment

echo "Building client..."
cd client && npm run build
cd ..

echo "Building server..."
cd server && npm run build
cd ..

echo "Build complete!"
