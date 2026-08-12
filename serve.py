# -*- coding: utf-8 -*-
"""本地调试服务器：禁用缓存，避免浏览器启发式缓存旧 js。
用法: python serve.py  (监听 127.0.0.1:8765, 根目录为脚本所在目录)
"""
import http.server
import functools
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", 8765), functools.partial(NoCacheHandler)).serve_forever()
