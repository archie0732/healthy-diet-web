import importlib.util
import pathlib
import sys
import types
import unittest


def _load_index_module():
    flask_module = types.ModuleType("flask")

    class DummyFlask:
        def __init__(self, name):
            self.name = name

        def route(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

    flask_module.Flask = DummyFlask
    flask_module.Response = lambda *args, **kwargs: None
    flask_module.jsonify = lambda payload=None, *args, **kwargs: payload
    flask_module.request = types.SimpleNamespace(
        method="GET",
        headers={},
        files={},
        form={},
        get_data=lambda: b"",
    )

    flask_cors_module = types.ModuleType("flask_cors")
    flask_cors_module.CORS = lambda app: app

    requests_module = types.ModuleType("requests")
    requests_module.request = lambda *args, **kwargs: None
    requests_module.exceptions = types.SimpleNamespace(
        Timeout=Exception,
        ConnectionError=Exception,
    )

    sys.modules.setdefault("flask", flask_module)
    sys.modules.setdefault("flask_cors", flask_cors_module)
    sys.modules.setdefault("requests", requests_module)

    spec = importlib.util.spec_from_file_location(
        "healthy_diet_web_api_index",
        pathlib.Path(__file__).with_name("index.py"),
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


index_module = _load_index_module()
TARGET_API_SERVER = index_module.TARGET_API_SERVER
build_target_url = index_module.build_target_url


class BuildTargetUrlTests(unittest.TestCase):
    def test_news_route_no_longer_re_adds_api_prefix(self):
        self.assertEqual(build_target_url("news"), f"{TARGET_API_SERVER}/news")

    def test_rag_route_no_longer_re_adds_api_prefix(self):
        self.assertEqual(build_target_url("rag/search"), f"{TARGET_API_SERVER}/rag/search")

    def test_openapi_yaml_route_points_to_rust_root_route(self):
        self.assertEqual(build_target_url("openapi.yml"), f"{TARGET_API_SERVER}/openapi.yml")


class ProxyStreamingTests(unittest.TestCase):
    def test_text_event_stream_responses_are_forwarded_as_streams(self):
        captured = {}

        class FakeUpstreamResponse:
            status_code = 200
            headers = {"Content-Type": "text/event-stream"}
            content = b"buffered-content-should-not-be-used"

            def iter_content(self, chunk_size=8192):
                yield b"event: text\n"
                yield b'data: {"type":"text","content":"hi"}\n\n'

        class FakeFlaskResponse:
            def __init__(self, response, status, headers):
                captured["response"] = response
                captured["status"] = status
                captured["headers"] = headers
                self.response = response
                self.status = status
                self.headers = headers

        index_module.request = types.SimpleNamespace(
            method="POST",
            headers={},
            files={},
            form={},
            get_data=lambda: b'{"message":"hi"}',
        )

        def fake_request(*args, **kwargs):
            captured["request_kwargs"] = kwargs
            return FakeUpstreamResponse()

        index_module.requests.request = fake_request
        index_module.Response = FakeFlaskResponse

        result = index_module.proxy("api/chat")

        self.assertIsInstance(result, FakeFlaskResponse)
        self.assertTrue(captured["request_kwargs"]["stream"])
        self.assertEqual(captured["status"], 200)
        self.assertIn(("Content-Type", "text/event-stream"), captured["headers"])
        streamed_chunks = list(captured["response"])
        self.assertEqual(
            streamed_chunks,
            [b"event: text\n", b'data: {"type":"text","content":"hi"}\n\n'],
        )


if __name__ == "__main__":
    unittest.main()
