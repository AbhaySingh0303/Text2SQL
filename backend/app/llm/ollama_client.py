import json
import httpx
from typing import AsyncGenerator
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)

async def stream_ollama_generate(prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
    """
    Sends a query generation request to the configured Ollama server and streams the 
    response chunk by chunk. Uses connection details loaded dynamically from configurations.
    """
    settings = get_settings()
    url = f"{settings.ollama_url.rstrip('/')}/api/generate"
    
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "system": system_prompt,
        "options": {
            "temperature": settings.ollama_temperature
        },
        "stream": True
    }
    
    logger.info(f"Streaming prompt to Ollama model {settings.ollama_model} at {url}")
    
    # 15s connection timeout, 90s read timeout to allow LLM execution buffer
    timeout = httpx.Timeout(15.0, read=90.0)
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    error_content = await response.aread()
                    raise Exception(
                        f"Ollama returned HTTP status {response.status_code}: "
                        f"{error_content.decode('utf-8', errors='ignore')}"
                    )
                
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        if chunk:
                            yield chunk
                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        logger.warning(f"Could not parse Ollama stream line as JSON: {line}")
                        continue
    except httpx.ConnectError:
        err_msg = f"Failed to connect to Ollama at {settings.ollama_url}. Verify that Ollama is running."
        logger.error(err_msg)
        raise Exception(err_msg)
    except Exception as e:
        logger.error(f"Error in Ollama stream execution: {e}")
        raise e
