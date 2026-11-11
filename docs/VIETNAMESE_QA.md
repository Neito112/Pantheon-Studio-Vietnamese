# Kiểm tra phần Việt hóa — 11/11/2026

Phạm vi: kiểm tra những thay đổi Việt hóa so với repo gốc, các catalogue, runtime i18n và cách giao diện sử dụng chúng. Các kiểm thử chức năng engine không được dùng để quy lỗi cho bản dịch. Không sửa engine, API client, store hay dependency của ứng dụng.

## Những vấn đề đã sửa

- Bộ chọn ngôn ngữ đã tồn tại nhưng chưa được gắn vào giao diện: đưa vào đầu trang Cài đặt.
- Tab, tiêu đề cửa sổ dock, shelf và mục tìm kiếm pane có thể giữ ngôn ngữ cũ: dùng translator từ React context và cập nhật tiêu đề dock khi đổi ngôn ngữ hoặc thêm panel. Không dựng lại layout khi đổi ngôn ngữ.
- Nhãn Markdown viết cứng bằng tiếng Việt: đưa về catalogue để cả tiếng Anh và tiếng Việt đều hiển thị đúng.
- Bổ sung chuỗi còn sót ở benchmark, Canvas, trạng thái agent, bảng task và bong bóng trong văn phòng 3D, nhãn phòng mới, hướng dẫn vẽ và ví dụ cấu hình.
- Excalidraw đã có sẵn tiếng Việt nhưng chưa nhận ngôn ngữ của ứng dụng: truyền `vi-VN` / `en` qua prop được thư viện hỗ trợ.
- Thêm `t` vào dependency của callback thông báo xung đột Markdown để tránh thông báo theo ngôn ngữ cũ.
- Helper định dạng thời gian làm mất phần giây của timestamp cục bộ: giữ nguyên giây, có kiểm thử hồi quy cho thời gian tương đối. Thay đổi này chỉ ảnh hưởng định dạng hiển thị.

## Bằng chứng kiểm tra

- 1.917 key tiếng Anh và 1.900 key tiếng Việt; chênh lệch do tiếng Việt dùng chung dạng số nhiều. Không thiếu bản dịch cho các key tiếng Anh, không sai tập biến nội suy, không có bản dịch rỗng hoặc key trùng giữa các domain.
- Kiểm tra AST các lời gọi dịch bằng key literal: key tồn tại và có đủ tham số nội suy. Các key cấu hình động được rà soát riêng; các chuỗi như `stage.md.mode`, `stage.updated` là khóa lưu trữ / sự kiện, không phải khóa dịch bị thiếu.
- So sánh 72 file nguồn đã chỉnh với HEAD: giữ nguyên 259 lời gọi API theo tên method. Các giá trị `<option>` được giữ nguyên; 10 kiểu sàn được chuyển từ option viết tay thành mảng `FLOORS` có cùng giá trị gốc. Đây là kiểm tra cấu trúc, không phải chứng minh tương đương toàn bộ chương trình.
- 11 kiểm thử i18n: coverage catalogue, biến nội suy, key trùng, lời gọi dịch, render provider và bộ chọn ngôn ngữ ở cả hai locale, lưu lựa chọn, translator ngoài React, số nhiều, định dạng, giữ nguyên phần trang trí trạng thái agent và giữ giây trong timestamp.
- Trình duyệt Chromium headless với API giả lập: đổi Việt → Anh, tải lại vẫn giữ Anh, đổi lại Việt, `html.lang` và localStorage đúng, bộ chọn vẫn thao tác được ở viewport nhỏ, không có JavaScript exception.
- Build giao diện production, TypeScript và ESLint không lỗi. Bộ test UI gồm 29 test có sẵn và 11 test i18n.

Lệnh kiểm tra:

```powershell
cd ui
npm test -- --run
npx eslint src --max-warnings 0
npm run build
```

Kiểm tra trình duyệt, từ thư mục repo, khi Vite đang chạy:

```powershell
engine/.venv/Scripts/python.exe ui/scripts/check-translations.py
```

Ảnh chụp và log build nằm trong `build/translation-qa/` (gitignored).

## Giới hạn về độ phủ

- Nội dung do người dùng / server / agent / pack cung cấp, tên riêng, mã lệnh, tên model, URL và giá trị cấu hình kỹ thuật giữ nguyên. Không tự dịch dữ liệu được lưu hoặc nội dung prompt nghiệp vụ.
- Menu bên trong Fortune Sheet chưa có tiếng Việt trong phiên bản thư viện đang dùng; các locale được cung cấp là en, es, hi, ru, zh và zh_tw. Các nhãn bao quanh trình bảng tính thuộc ứng dụng đã có catalogue.
- Kiểm tra trình duyệt dùng API giả lập để cô lập phần dịch; không kiểm chứng lại việc chạy agent với tài khoản AI thật hoặc mọi trạng thái của repo gốc.
- Bản phát hành GitHub `vi-2.0.2-r1` đóng gói lại từ mã nguồn sau đợt rà soát này, gồm bộ cài Windows x64, ZIP có runtime và hướng dẫn HTML. `BUILD-INFO.json` trong release ghi commit nguồn; `SHA256SUMS.txt` ghi mã kiểm tra các tệp tải xuống. Release này không bao gồm bản macOS/Linux đã build.

## Key bổ sung

```text
stage.md.listLabel
stage.md.todoLabel
bench.run.turnCount
bench.run.toolCallCount
bench.imports.importJobBench
bench.imports.importLab
shell.canvas.empty
shell.canvas.replayEmpty
shell.canvas.replay
shell.canvas.hint
shell.canvas.rearrange
shell.state.paused
shell.state.standby
shell.state.working
shell.state.needsYou
shell.state.failed
shell.state.retrying
shell.state.coolingDown
shell.state.queued
shell.state.idle
office.newRoom
office.clickToDraw
office.board.todo
office.board.doing
office.board.blocked
office.board.review
office.board.done
office.bubble.approval
office.bubble.stopped
office.bubble.thinking
settings.provider.localPreset
settings.mcp.remoteExample
```
