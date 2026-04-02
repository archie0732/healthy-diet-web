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

    # 加上 .items() 確保在 Vercel WSGI 環境下能安全讀取 headers
    headers = {
        key: value for key, value in request.headers.items() if key.lower() != "host"
    }

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
                timeout=10,  # 強制 10 秒逾時，不讓 Vercel 乾等到崩潰
            )
        else:
            resp = requests.request(
                method=request.method,
                url=target_url,
                headers=headers,
                data=request.get_data(),
                timeout=10,
            )

    except requests.exceptions.Timeout:
        # 回傳乾淨的 JSON，讓前端不會出現 JSON.parse 錯誤
        return jsonify(
            {"error": "代理伺服器連線逾時！這代表 Vercel 被你學校的防火牆擋在外面了。"}
        ), 504
    except requests.exceptions.ConnectionError:
        return jsonify(
            {
                "error": "代理伺服器連線被拒絕！請確認 120.110.113.111:3000 對國外 IP 是否有開放。"
            }
        ), 502
    except Exception as e:
        return jsonify({"error": f"Python 內部發生未預期的錯誤: {str(e)}"}), 500

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
