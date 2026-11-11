import type { Catalog } from "../../types";

/** The meta agents: Zeus (supervisor), Argus (overseer) and Kronos (engineer). */
const meta: Catalog = {
  // ── Shared chat shell (components/MetaChat.tsx) ─────────────────────────────
  "meta.chat.stop": "■ Dừng",
  "meta.chat.runsOnLabel": "Chạy trên: ",
  "meta.chat.runsOnTitle": "Chọn thứ chạy {name}: Pantheon với một mô hình, hoặc một agent như Claude Code, Codex hay Hermes",
  "meta.chat.runsOnDefault": "mặc định",
  "meta.chat.speak": "Đọc",
  "meta.chat.reset": "Đặt lại",
  "meta.chat.resetTitle": "Khởi đầu lại {name} với cài đặt gốc",
  "meta.chat.thinking": "đang suy nghĩ…",
  "meta.chat.back": "‹ Quay lại",

  // ── Model dialog ──────────────────────────────────────────────────────────
  "meta.model.title": "Thứ chạy {name}",
  "meta.model.tabKind": "Kiểu",
  "meta.model.tabModel": "Mô hình",
  "meta.model.kindHelp":
    "{name} giữ chỉ dẫn, tool và cuộc trò chuyện với bạn dù thứ nào chạy nó. Một agent khác, như Claude Code, Codex hay Hermes, nhận tool của {name} qua cầu nối MCP của Pantheon.",
  "meta.model.llmHelp":
    "{name} dùng provider mặc định trừ khi bạn chọn ở đây. Một mô hình mạnh, gọi tool ổn định sẽ hợp nhất: {name} xây dựng và thay đổi tổ chức giúp bạn.",
  "meta.model.otherHelp":
    "{name} chạy trên một agent khác, và agent đó tự chọn mô hình ở bảng Kiểu. Pantheon vẫn dùng mô hình này cho các việc nhỏ của {name}, chẳng hạn như soạn một tổ chức mới.",

  // ── Reset dialog ──────────────────────────────────────────────────────────
  "meta.reset.title": "Đặt lại {name}?",
  "meta.reset.body":
    "Việc này dừng {name} đang làm, xoá cuộc trò chuyện của bạn với {name}, xoá ngữ cảnh của nó, và trả tên, chỉ dẫn, tool, kiểu, mô hình cùng hạn mức về đúng bản gốc.",
  "meta.reset.forget": "Quên luôn ký ức dài hạn của {name}",
  "meta.reset.action": "Đặt lại {name}",

  // ── Zeus, the supervisor (app/supervisor/page.tsx) ────────────────────────
  "meta.zeus.subtitle":
    "Người giám sát của Pantheon. Thiết kế tổ chức và không gian của bạn, đưa tài nguyên 3D vào, tinh chỉnh agent, và xử lý các yêu cầu của họ.",
  "meta.zeus.intro": "Hãy nói với Zeus bạn muốn agent của mình làm gì. Nó có thể xây cả một tổ chức, cùng không gian nơi họ sống, cho bạn.",
  "meta.zeus.placeholder": "Mô tả tổ chức bạn cần, hoặc yêu cầu thay đổi…",
  "meta.zeus.sideLabel": "Yêu cầu",
  "meta.zeus.prompt1":
    "Thiết kế giúp tôi một tổ chức: một nhóm nhỏ nghiên cứu đối thủ cạnh tranh và viết bản tin hằng tuần.",
  "meta.zeus.prompt2":
    "Dựng một cảnh quảng trường nhỏ cho mô phỏng xã hội, có quán cà phê, một đồn cảnh sát và vài cư dân.",
  "meta.zeus.prompt3": "Sắp xếp lại các yêu cầu tính năng đang mở.",
  "meta.zeus.prompt4":
    "Tìm một mô hình 3D miễn phí của máy bán hàng tự động trên mạng và đặt nó vào bếp của tổ chức đầu tiên của tôi.",
  "meta.zeus.prompt5":
    "Tổ chức họp đứng mỗi sáng lúc 9 giờ trong phòng hội nghị, và cho các agent của tôi cách đưa cà phê cho nhau.",
  "meta.zeus.tabRequests": "Yêu cầu",
  "meta.zeus.tabTools": "Tool",
  "meta.zeus.tabAssets": "Tài nguyên & plugin",
  "meta.zeus.tabActivity": "Hoạt động",
  "meta.zeus.requestsEmpty":
    "Chưa có yêu cầu nào. Khi một agent cần tool, quyền truy cập hay đồng nghiệp mà nó không có, nó sẽ gửi yêu cầu ở đây.",
  "meta.zeus.requestWhy": "Vì: {reason}",
  "meta.zeus.resolutionPlaceholder": "Cách xử lý / ghi chú",
  "meta.zeus.update": "Cập nhật",
  "meta.zeus.seeRequesterSessions": "Xem các session của người gửi →",
  "meta.zeus.statusOpen": "đang mở",
  "meta.zeus.statusTriaged": "đã phân loại",
  "meta.zeus.statusAccepted": "đã nhận",
  "meta.zeus.statusInProgress": "đang làm",
  "meta.zeus.statusDone": "xong",
  "meta.zeus.statusRejected": "đã từ chối",

  // ── Argus, the overseer (app/argus/page.tsx) ──────────────────────────────
  "meta.argus.subtitle":
    "Người giám sát toàn cảnh. Kiểm tra các tổ chức của bạn khi bạn nhờ hoặc theo lịch, và cho biết điều gì cần chú ý.",
  "meta.argus.intro": "Nhờ Argus kiểm tra xem các tổ chức của bạn có đi đúng kế hoạch không, hoặc để nó canh giám một tổ chức.",
  "meta.argus.placeholder": "Nhờ Argus kiểm tra một tổ chức…",
  "meta.argus.sideLabel": "Canh giám",
  "meta.argus.prompt1": "Kiểm tra tất cả tổ chức của tôi: mọi thứ có đang tiến triển đúng kế hoạch không?",
  "meta.argus.prompt2": "Có ai đang bị kẹt, lặp lại hoặc thất bại ngay lúc này không?",
  "meta.argus.prompt3":
    "Cứ 30 phút hãy nhìn tổ chức đầu tiên của tôi một lần và báo tôi nếu công việc lệch khỏi mục tiêu.",
  "meta.argus.prompt4": "So sánh điều mỗi đội được giao với những gì họ thực sự bàn giao.",
  "meta.argus.tabWatches": "Canh giám",
  "meta.argus.tabActivity": "Argus đang làm gì",
  "meta.argus.watchesEmpty":
    "Argus chưa canh giám gì cả. Hỏi nó trong khung chat, hoặc đặt một lượt canh giám bên dưới — nó sẽ kiểm tra theo lịch và gửi cảnh báo vào hộp thư của tổ chức.",
  "meta.argus.everyMinutes": "mỗi {count} phút",
  "meta.argus.lastCheck": "kiểm tra lần cuối {when}",
  "meta.argus.newWatch": "Lượt canh giám mới",
  "meta.argus.organization": "Tổ chức",
  "meta.argus.choose": "Chọn…",
  "meta.argus.checkEvery": "Kiểm tra mỗi (phút)",
  "meta.argus.focus": "Cần canh giám điều gì",
  "meta.argus.focusHint": "Mục tiêu, hạn chót, rủi ro — bằng lời của bạn",
  "meta.argus.focusPlaceholder": "ví dụ: danh sách kiểm tra ra mắt xong trước thứ Sáu; không ai bị kẹt quá lâu",
  "meta.argus.watch": "Canh giám",

  // ── Kronos, the engineer (app/kronos/page.tsx) ────────────────────────────
  "meta.kronos.subtitle":
    "Kỹ sư. Làm việc trên máy tính của bạn: thay đổi mã nguồn của chính Pantheon khi Zeus hoặc bạn cần, và xử lý tệp trong các thư mục bạn cho phép.",
  "meta.kronos.intro":
    "Nhờ Kronos thêm một năng lực mới hoặc sửa lỗi cho Pantheon, hoặc làm việc với tệp trên máy tính của bạn. Mọi thay đổi mã nguồn đều được kiểm thử trước khi áp dụng.",
  "meta.kronos.placeholder": "Nhờ Kronos xây hoặc sửa một thứ…",
  "meta.kronos.sideLabel": "Máy tính",
  "meta.kronos.prompt1": "Thêm một tool có sẵn để agent đọc được feed RSS.",
  "meta.kronos.prompt2": "Zeus nói các agent cần xuất CSV từ bảng task. Bạn xây được không?",
  "meta.kronos.prompt3": "Ngay lúc này bạn có thể chạm tới những gì trên máy tính của tôi?",
  "meta.kronos.prompt4": "Tóm tắt các báo cáo trong thư mục được phép của tôi thành một tài liệu.",
  "meta.kronos.tabComputer": "Máy tính",
  "meta.kronos.tabActivity": "Kronos đang làm gì",
  "meta.kronos.thisComputer": "máy tính này",
  "meta.kronos.pantheonCode": "Mã nguồn Pantheon",
  "meta.kronos.notFromSource":
    "Pantheon được cài đặt, không chạy từ mã nguồn của nó, nên Kronos không thể thay đổi mã nguồn ở đây.",
  "meta.kronos.changesMergeIntoBranch": "thay đổi được hợp nhất vào branch {branch}, sau khi các kiểm tra đạt",
  "meta.kronos.allowedFolders": "Các thư mục bạn cho phép",
  "meta.kronos.changesInProgress": "Thay đổi đang thực hiện",
  "meta.kronos.noChanges": "Không có.",
  "meta.kronos.howTitle": "Cách Kronos thay đổi Pantheon",
  "meta.kronos.howBody":
    "Mọi thay đổi đều được làm trên git branch riêng trong một worktree tách biệt, không bao giờ trong bản sao làm việc của bạn. Khi áp dụng, nó chạy lint, kiểm tra kiểu và các bộ test; chỉ thay đổi nào vượt qua mới được hợp nhất vào branch hiện tại của bạn, rồi Pantheon tự dựng lại (một hoặc hai phút). Nếu phần việc chưa commit của bạn chạm vào cùng những tệp đó, Kronos sẽ dừng lại và hỏi bạn trước. Các lệnh shell ngoài những kiểm tra này cần bạn duyệt.",
};

export default meta;
