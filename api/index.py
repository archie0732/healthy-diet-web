import os

import requests
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

TARGET_API_SERVER = os.environ.get("TARGET_API_SERVER", "http://120.110.113.111:3000")


@app.route(
    "/api/",
    defaults={"path": ""},
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
)
@app.route(
    "/api/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
)
def proxy(path):
    if request.method == "OPTIONS":
        return Response("", status=200)

    target_url = f"{TARGET_API_SERVER}/{path}"
    headers = {key: value for (key, value) in request.headers if key.lower() != "host"}

    # --- 加入 try...except 防止 Python 崩潰導致 Vercel 回傳 HTML ---
    try:
        if request.files:
            files = {}
            for key, file in request.files.items():
                files[key] = (file.filename, file.stream.read(), file.content_type)

            if "Content-Type" in headers:
                del headers["Content-Type"]

            resp = requests.request(
                method=request.method,
                url=target_url,
                headers=headers,
                data=request.form,
                files=files,
                timeout=15,  # 加入 15 秒逾時設定，防止 Vercel 函數超時掛掉
            )
        else:
            resp = requests.request(
                method=request.method,
                url=target_url,
                headers=headers,
                data=request.get_data(),
                timeout=15,
            )
    except requests.exceptions.RequestException as e:
        # 如果 Flask 無法連上學校伺服器，回傳 JSON 格式的 502 錯誤
        return jsonify({"error": f"代理伺服器連線失敗: {str(e)}"}), 502
    except Exception as e:
        # 捕捉其他非預期的 Python 錯誤
        return jsonify({"error": f"代理伺服器內部錯誤: {str(e)}"}), 500

    excluded_headers = [
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
    ]
    resp_headers = [
        (name, value)
        for (name, value) in resp.headers.items()
        if name.lower() not in excluded_headers
    ]

    return Response(resp.content, resp.status_code, resp_headers)
