#!/usr/bin/env node

// Super simple server to run your DHA documents
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5000;

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    if (extname === '.js') contentType = 'text/javascript';
    if (extname === '.css') contentType = 'text/css';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('✅ DHA Documents Ready!');
    console.log('📍 Server running at http://0.0.0.0:' + PORT);
    console.log('🎯 Your documents are ready to download!');
});