import type { Catalog } from "../../types";

/** Benchmark: chạy SwarmBench trên bản sao của một tổ chức, so sánh và tinh chỉnh đội. */
const bench: Catalog = {
  "bench.run.turnCount": "{count} lượt",
  "bench.run.toolCallCount": "{count} lần gọi tool",
  "bench.imports.importJobBench": "Nhập JobBench",
  "bench.imports.importLab": "Nhập LAB",
  // ── Trang benchmark ────────────────────────────────────────────────────────
  "bench.title": "Benchmark",
  "bench.intro":
    "Đo xem một tổ chức làm việc tốt đến đâu. Mỗi task chạy trên một bản sao tạm của tổ chức (cùng agent, mô hình, tool và cách báo cáo, mọi tool đều được duyệt tự động) trong một thư mục làm việc mới; người dẫn nhận task, và khi đội im lặng, SwarmBench chấm thư mục đó: bằng các test ẩn, hoặc với các task chuyên nghiệp được nhập (JobBench, LAB) bằng một giám khảo kiểm từng mục rubric. Tích vào các lượt chạy để so sánh chúng.",
  "bench.empty.title": "Chưa có lượt chạy benchmark nào",
  "bench.empty.body": "Hãy chọn một tổ chức và vài task ở trên.",
  "bench.newRun.title": "Lượt chạy mới",
  "bench.organization": "Tổ chức",
  "bench.workflow": "Workflow",
  "bench.workflow.soloHint": "Một agent: dùng workflow solo (workflow đội sẽ đòi những vai trò mà nó không có)",
  "bench.workflow.compareHint":
    "Để so sánh với một agent, hãy dùng cùng một workflow cho cả hai: workflow đội đòi thêm phần viết báo cáo, và những phần đó được chấm điểm",
  "bench.workflow.taskOwn": "Workflow riêng của từng task",
  "bench.workflow.none": "Không có (tự làm theo cách của họ)",
  "bench.lead": "Người dẫn",
  "bench.leadHint": "Ai nhận task (mặc định: người đứng đầu sơ đồ tổ chức)",
  "bench.automatic": "tự động",
  "bench.repeats": "Số lần lặp",
  "bench.repeatsHint": "Agent có khác nhau; lặp lại để thấy độ chênh",
  "bench.atOnce": "Số chạy cùng lúc",
  "bench.atOnceHint": "Số task chạy song song (mỗi task một bản sao riêng)",
  "bench.timeLimit": "Giới hạn thời gian mỗi task (phút)",
  "bench.timeLimitHint": "Mặc định: gấp đôi hạn mức của task",
  "bench.tasks": "Task",
  "bench.tasks.all": "tất cả",
  "bench.tasks.none": "không",
  "bench.taskMeta": "{source} · {category} · {difficulty} · ~{minutes} phút",
  "bench.start": "Chạy benchmark",
  "bench.taskRuns": "{count} task chạy{suffix}, khoảng {minutes} phút hạn mức. Dùng provider mô hình của bạn như công việc bình thường.",

  // ── Danh sách lượt chạy ────────────────────────────────────────────────────
  "bench.run.compareTitle": "So sánh",
  "bench.run.taskWorkflows": "workflow theo task",
  "bench.run.tasksProgress": "{done}/{total} task",
  "bench.run.watchLive": "Xem trực tiếp ↗",
  "bench.run.hiddenCopy":
    "Task chạy trên một bản sao ẩn của {org}, nên agent của bạn vẫn rảnh. Dùng “Xem trực tiếp” để xem văn phòng, hội thoại và bảng công việc của bản sao.",

  // ── Bảng kết quả ──────────────────────────────────────────────────────────
  "bench.results.empty": "Chưa có task nào được chấm.",
  "bench.results.colTask": "Task",
  "bench.results.colWorkflow": "Workflow",
  "bench.results.colScore": "Điểm",
  "bench.results.colChecked": "Đã kiểm",
  "bench.results.colAgentTests": "Test của agent",
  "bench.results.colSafety": "An toàn",
  "bench.results.colProcess": "Quy trình",
  "bench.results.colTime": "Thời gian",
  "bench.results.colTurns": "Lượt",
  "bench.results.colAgents": "Agent",
  "bench.results.colTokens": "Token",
  "bench.results.colCost": "Chi phí",
  "bench.results.colEnded": "Kết thúc",
  "bench.results.workflowNone": "không có",
  "bench.results.tests": "{passed}/{total} test",
  "bench.results.rubricItems": "{met}/{total} mục rubric",

  // ── Nhập benchmark chuyên nghiệp ──────────────────────────────────────────
  "bench.imports.title": "Benchmark chuyên nghiệp",
  "bench.imports.desc":
    "JobBench (65 task từ khoảng 35 nghề: đối chiếu, báo cáo, phân tích) và LAB (task luật của Harvey, theo lĩnh vực), cả hai đều giấy phép MIT. Một giám khảo trên mô hình kiểm tra của bạn (hoặc của Zeus) kiểm từng mục rubric; rubric không nằm trong thư mục của agent, và các máy chủ nơi rubric công khai bị chặn trong lúc chạy. LAB khoảng 2 GB, nên hãy nhập theo lĩnh vực.",
  "bench.imports.atMost": "Tối đa (task)",
  "bench.imports.all": "tất cả",
  "bench.imports.labAreas": "Lĩnh vực của LAB",
  "bench.imports.importing": "đang nhập {benchmark}",

  // ── Tinh chỉnh đội ─────────────────────────────────────────────────────────
  "bench.tuning.title": "Tinh chỉnh một đội",
  "bench.tuning.desc":
    "Chạy tổ chức trên một task như hiện tại, cho hai biên tập viên đề xuất thay đổi dựa trên những gì lượt chạy cho thấy (một người về cách đội làm việc, một người về kiến thức ngành dưới dạng kỹ năng), chạy cả hai đội đã sửa, nhận lấy những thay đổi mà các lượt chạy ủng hộ, và lưu bài học vào thư viện kinh nghiệm mà Zeus thiết kế. Khoảng bốn lượt chạy của task. Tổ chức của bạn chỉ đổi khi bạn áp dụng kết quả. (Theo harness2, Google Research.)",
  "bench.tuning.task": "Task",
  "bench.tuning.start": "Bắt đầu tinh chỉnh",
  "bench.tuning.onTask": "trên {task}",
  "bench.tuning.run.base": "Như hiện tại",
  "bench.tuning.run.inv": "Cách đội làm việc",
  "bench.tuning.run.dom": "Kiến thức ngành",
  "bench.tuning.run.final": "Đã tổng hợp",
  "bench.tuning.minutes": " · {minutes} phút",
  "bench.tuning.lesson": "Bài học",
  "bench.tuning.lessonBody": "khi {cue}, {lesson}",
  "bench.tuning.apply": "Áp dụng cho {org}",
  "bench.tuning.applied": "Đã áp dụng: {text}",
  "bench.tuning.nothingDiffered": "không có gì khác",

  // ── So sánh ────────────────────────────────────────────────────────────────
  "bench.compare.title": "So sánh",
  "bench.compare.clear": "Xoá trắng",
  "bench.compare.colTask": "Task",
  "bench.compare.meanScore": "Điểm trung bình",
  "bench.compare.fullScores": "Số task đạt điểm tuyệt đối",
  "bench.compare.time": "Thời gian",
  "bench.compare.tokens": "Token",
  "bench.compare.cost": "Chi phí",
  "bench.compare.pointsPerDollar": "Điểm trên mỗi $",
  "bench.compare.timeouts": "Số lần quá hạn",
  "bench.compare.modelCalls": "Lượt gọi mô hình",
  "bench.compare.modelTime": "Thời gian của mô hình",
  "bench.compare.fromCache": "Từ bộ nhớ đệm của máy chủ",
  "bench.compare.toolCalls": "Lượt gọi tool",
  "bench.compare.messages": "Tin nhắn",
  "bench.compare.editsFailed": "Số sửa đổi thất bại",
  "bench.compare.subagents": "Subagent",
  "bench.compare.acceptanceChecks": "Lượt kiểm tra nghiệm thu",
};

export default bench;
