import reflex as rx
import os

config = rx.Config(
    app_name="app",
    api_url="http://localhost:8000",
    plugins=[
        rx.plugins.SitemapPlugin(),
        #rx.plugins.TailwindV4Plugin(),
    ]
)