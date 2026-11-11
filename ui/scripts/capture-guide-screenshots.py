"""Capture the real Vietnamese UI with isolated practice data (no user accounts).

Run from the repo root with engine/.venv/Scripts/python.exe after building ui/.
Screenshots are saved under docs/images/guide-vi and embedded in the offline guide.
"""
from __future__ import annotations

import asyncio
import base64
from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time

import httpx
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/images/guide-vi"
UI = ROOT / "ui/dist"


def main():
    assert (UI / "index.html").exists(), "Build ui first"
    OUT.mkdir(parents=True, exist_ok=True)
    data = Path(tempfile.mkdtemp(prefix="pantheon-guide-vi-"))
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    snapshot_ui = data / "ui"
    shutil.copytree(UI, snapshot_ui)
    env = {**os.environ, "PANTHEON_DATA_DIR": str(data), "PANTHEON_PORT": str(port),
           "PANTHEON_UI_DIR": str(snapshot_ui), "PANTHEON_EMBEDDINGS": "hash",
           "PANTHEON_KEY_STORE": "file", "PYTHONIOENCODING": "utf-8"}
    os.environ.update({k: v for k, v in env.items() if k.startswith("PANTHEON_")})
    log_dir = ROOT / "build/guide-vi-capture"
    log_dir.mkdir(parents=True, exist_ok=True)
    log = (log_dir / "engine.log").open("w", encoding="utf-8")
    proc = subprocess.Popen([sys.executable, "-m", "app.serve"], cwd=ROOT / "engine",
                            env=env, stdout=log, stderr=subprocess.STDOUT,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    errors = []
    try:
        with httpx.Client(base_url=base, timeout=30) as client:
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    raise RuntimeError("engine stopped; see build/guide-vi-capture/engine.log")
                try:
                    if client.get("/api/v1/health").status_code == 200:
                        break
                except httpx.TransportError:
                    pass
                time.sleep(.25)
            else:
                raise RuntimeError("engine did not start")

            def request(method, endpoint, body=None):
                response = client.request(method, "/api/v1" + endpoint, json=body)
                response.raise_for_status()
                return response.json() if response.content else None

            org = request("POST", "/orgs", {"name": "Buổi họp nội bộ · Thực hành",
                          "description": "Dữ liệu minh họa cho hướng dẫn tiếng Việt, không phải công việc thật",
                          "setup": {"source": "new", "git": False, "worktrees": False}})
            oid = org["id"]
            request("PATCH", f"/orgs/{oid}", {"status": "paused"})
            agents = []
            for name, role, color in [("Mai", "Dẫn nhóm", "#8b7cff"), ("An", "Chuẩn bị tài liệu", "#43bd9b"), ("Linh", "Kiểm tra kết quả", "#dfad65")]:
                agents.append(request("POST", f"/orgs/{oid}/agents", {"name": name, "role": role,
                              "team": "Chuẩn bị họp", "persona": "Làm việc bằng tiếng Việt, không tự đặt thông tin chưa biết",
                              "tools": [], "avatar": {"outfit": color}}))
            for i, (title, status, owner) in enumerate([
                ("Xác nhận thời gian họp", "todo", 0),
                ("Chuẩn bị phòng và màn hình", "in_progress", 1),
                ("Tổng hợp tài liệu cho 8 người", "in_progress", 1),
                ("Kiểm tra thông tin còn thiếu", "review", 2),
                ("Soạn danh sách việc cần làm", "done", 0),
            ]):
                task = request("POST", f"/orgs/{oid}/tasks", {"title": title, "assigneeId": agents[owner]["id"],
                               "description": "Dữ liệu thực hành: đối chiếu yêu cầu, ghi Cần xác nhận ở thông tin chưa biết",
                               "acceptanceCriteria": "Không tự đặt ngày, người phụ trách hay ngân sách", "priority": "normal"})
                request("PATCH", f"/tasks/{task['id']}", {"status": status})
            doc = request("POST", f"/orgs/{oid}/docs", {"kind": "markdown", "title": "Kế hoạch buổi họp nội bộ"})
            request("PUT", f"/docs/{doc['id']}/text", {"text": "# Kế hoạch buổi họp nội bộ\n\n> Dữ liệu thực hành cho hướng dẫn tiếng Việt\n\n## Mục tiêu\nChuẩn bị đầy đủ phòng họp, thiết bị và tài liệu cho **8 người**.\n\n## Danh sách chuẩn bị\n- Phòng họp và màn hình trình chiếu\n- Tài liệu gửi trước buổi họp\n- Người ghi biên bản\n\n## Bảng việc cần làm\n| Việc | Người phụ trách | Hạn |\n| --- | --- | --- |\n| Xác nhận phòng | Cần xác nhận | Cần xác nhận |\n| Chuẩn bị tài liệu | Cần xác nhận | Cần xác nhận |\n| Kiểm tra màn hình | Cần xác nhận | Cần xác nhận |\n\n## Cần hỏi lại\n1. Ngày và thời lượng buổi họp?\n2. Ai chịu trách nhiệm từng việc?\n3. Ngân sách được duyệt là bao nhiêu?\n"})
            graph = {"nodes": [
                {"id": "nhan", "agentId": agents[0]["id"], "title": "Nhận ghi chú", "instructions": "Tách thông tin đã biết và phần cần hỏi lại", "x": 0, "y": 100},
                {"id": "soan", "agentId": agents[1]["id"], "title": "Soạn kế hoạch", "instructions": "Tạo bảng việc và danh sách chuẩn bị", "x": 310, "y": 100},
                {"id": "duyet", "agentId": agents[2]["id"], "title": "Kiểm tra & bàn giao", "instructions": "Đối chiếu tiêu chí và liệt kê phần chưa xác minh", "x": 620, "y": 100},
            ], "edges": [{"from": "nhan", "to": "soan"}, {"from": "soan", "to": "duyet"}]}
            request("POST", f"/orgs/{oid}/flows", {"name": "Chuẩn bị họp · Quy trình mẫu", "graph": graph})
            # A clearly labelled practice trace, persisted through the normal models.
            sys.path.insert(0, str(ROOT / "engine"))
            from app.core.db import SessionLocal, engine
            from app.models import Turn, ToolCall, Whiteboard, LlmCall
            from sqlalchemy import update

            async def add_trace():
                async with SessionLocal() as session:
                    await session.execute(update(Whiteboard).where(Whiteboard.org_id == oid).values(title="Bảng thảo luận"))
                    turn = Turn(org_id=oid, agent_id=agents[0]["id"], status="completed", steps=2,
                                summary="Dữ liệu thực hành: tổng hợp ghi chú và kiểm tra đầu ra", ended_at=datetime.now(timezone.utc))
                    session.add(turn)
                    await session.flush()
                    session.add(ToolCall(id="tc_guide_vi", org_id=oid, agent_id=agents[0]["id"], turn_id=turn.id,
                                        name="write_file", args={"path": "ke-hoach-hop.md"}, status="ok",
                                        result="Ví dụ thực hành: đã tạo kế hoạch, để Cần xác nhận ở thông tin chưa biết"))
                    session.add(LlmCall(org_id=oid, agent_id=agents[0]["id"], turn_id=turn.id,
                                        model="Mô hình minh họa", provider="mock", purpose="turn",
                                        response={"content": "Dữ liệu thực hành: tổng hợp ghi chú thành kế hoạch, giữ nguyên các thông tin cần xác nhận.",
                                                  "tool_calls": [{"id": "tc_guide_vi", "name": "write_file", "args": {"path": "ke-hoach-hop.md"}}]}))
                    session.add(LlmCall(org_id=oid, agent_id=agents[0]["id"], turn_id=turn.id,
                                        model="Mô hình minh họa", provider="mock", purpose="turn",
                                        response={"content": "Đã đối chiếu danh sách thiết bị và số người. Ngày họp, người phụ trách và ngân sách vẫn cần bạn xác nhận."}))
                    await session.commit()
                    return turn.id
            turn_id = asyncio.run(add_trace())
            asyncio.run(engine.dispose())

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
                context = browser.new_context(viewport={"width": 1600, "height": 1000}, locale="vi-VN", device_scale_factor=1)
                context.add_init_script("localStorage.setItem('pantheon:locale','vi');localStorage.setItem('studio.view','tabs');")
                page = context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))

                def capture(name):
                    page.evaluate("document.fonts.ready")
                    page.wait_for_timeout(800)
                    assert page.locator("html").get_attribute("lang") == "vi"
                    page.screenshot(path=str(OUT / (name + ".png")), animations="disabled")
                    print("Captured", name, flush=True)

                page.goto(f"{base}/org/{oid}")
                page.get_by_role("button", name="Văn phòng", exact=True).wait_for()
                page.wait_for_timeout(9000)
                page.get_by_title("Ẩn (nhường chỗ cho văn phòng)", exact=True).click()
                capture("office")
                page.get_by_role("button", name="Bảng", exact=True).click()
                page.get_by_text("Xác nhận thời gian họp", exact=True).wait_for()
                capture("board")
                page.get_by_role("button", name="Sân khấu", exact=True).click()
                page.get_by_text("Kế hoạch buổi họp nội bộ", exact=True).first.click()
                page.get_by_text("Danh sách chuẩn bị", exact=False).first.wait_for()
                capture("stage")
                page.goto(f"{base}/org/{oid}/sessions?turn={turn_id}")
                page.get_by_role("button", name="Phiên", exact=True).first.wait_for()
                page.get_by_text("write_file", exact=False).first.wait_for()
                capture("sessions")
                page.get_by_role("button", name="Flow", exact=True).click()
                page.get_by_text("Nhận ghi chú", exact=True).first.wait_for()
                capture("flow")
                page.goto(f"{base}/supervisor")
                page.get_by_placeholder(re.compile("Mô tả tổ chức")).wait_for()
                page.wait_for_timeout(2500)
                capture("zeus")
                browser.close()
        assert not errors, errors
        guide = ROOT / "docs/HUONG_DAN_SU_DUNG.html"
        html = guide.read_text(encoding="utf-8")
        for name in ("office", "board", "stage", "sessions", "flow", "zeus"):
            image = Image.open(OUT / (name + ".png")).convert("RGB")
            image.thumbnail((1600, 1000))
            output = io.BytesIO()
            image.save(output, "WEBP", quality=90, method=6)
            (OUT / (name + ".webp")).write_bytes(output.getvalue())
            uri = "data:image/webp;base64," + base64.b64encode(output.getvalue()).decode("ascii")
            pattern = rf"(?m)^( {name}:\{{.*?image:')data:image/webp;base64,[^']+(')"
            html, count = re.subn(pattern, lambda match: match[1] + uri + match[2], html)
            assert count == 1, name
            if name == "office":
                html, count = re.subn(r'(<img id="atlasImage" src=")data:image/webp;base64,[^"]+(\")', lambda match: match[1] + uri + match[2], html)
                assert count == 1
        html = html.replace("Bấm tên khu vực để xem ảnh và cách dùng. Ảnh lấy từ repo gốc nên nhãn trong ảnh có thể là tiếng Anh; phần mô tả dùng tên Việt tương ứng.", "Bấm tên khu vực để xem ảnh và cách dùng. Ảnh được chụp từ giao diện tiếng Việt với dữ liệu thực hành riêng, tương ứng với bài tập buổi họp nội bộ trong hướng dẫn.")
        html = html.replace("Ảnh thực tế từ repo gốc · bấm ảnh để phóng to", "Giao diện tiếng Việt · dữ liệu thực hành · bấm ảnh để phóng to")
        html = html.replace("Ảnh minh họa từ repo gốc; tên trong ảnh có thể là tiếng Anh.", "Ảnh chụp giao diện tiếng Việt với dữ liệu thực hành; không chứa tài khoản hay công việc của bạn.")
        html = html.replace("Văn phòng 3D trong Pantheon Studio, ảnh minh họa từ repo gốc", "Văn phòng 3D trong Pantheon Studio bản tiếng Việt, dữ liệu thực hành")
        html = html.replace("Ảnh giao diện: docs/images từ repo Pantheon gốc; chỉ minh họa chức năng, không phải ảnh tổ chức/tài khoản của bạn.", "Ảnh giao diện: chụp trực tiếp bản Việt hóa bằng trình duyệt, sử dụng engine và dữ liệu thực hành riêng. Trace trong Phiên là dữ liệu minh họa, không phải kết quả xử lý AI thật; không dùng tổ chức/tài khoản của bạn.")
        html = html.replace("Bảng task sau một lượt rà soát hợp đồng trong repo gốc", "Bảng công việc chuẩn bị họp trong giao diện tiếng Việt")
        html = html.replace("Một website đặt lịch được mở trong Sân khấu", "Tài liệu kế hoạch họp được mở trong Sân khấu bản tiếng Việt")
        html = html.replace("Flow có bước đặc tả, các nhánh xây dựng và bước kiểm tra", "Flow nhận ghi chú, soạn kế hoạch và kiểm tra trong giao diện tiếng Việt")
        guide.write_text(html, encoding="utf-8")
        (OUT / "capture-info.json").write_text(json.dumps({"locale": "vi", "source": "Real production UI and local engine with isolated practice data", "trace": "Seeded practice example, not a real AI execution", "views": ["office", "board", "stage", "sessions", "flow", "zeus"]}, indent=2) + "\n", encoding="utf-8")
        print("PASS: 6 Vietnamese screenshots captured and embedded", flush=True)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()
        log.close()


if __name__ == "__main__":
    main()
