# Servidor local para probar los temas (módulos ES y texturas WebGL no funcionan por file://).
# Igual que `python -m http.server`, pero sin caché (siempre se ve la última versión de cada
# archivo) y con más cola de conexiones (una página pide decenas de archivos a la vez).
# Uso: python serve.py   →  http://127.0.0.1:8037/  (puerto registrado en 48.SkillShot/PORTS.md)
import functools, http.server, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8037
handler = functools.partial(NoCache, directory='.')
print(f'iroFactory en http://127.0.0.1:{port}/')
Server(('127.0.0.1', port), handler).serve_forever()
