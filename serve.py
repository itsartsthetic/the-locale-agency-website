import os
import http.server
import socketserver

os.chdir("/Users/sp/Documents/GitHub/the-locale-agency-website")
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", 8090), Handler) as httpd:
    print("Serving on port 8090")
    httpd.serve_forever()
