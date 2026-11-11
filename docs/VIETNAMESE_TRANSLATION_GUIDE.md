# Bản dịch tiếng Việt cho Pantheon Studio — hướng dẫn chuẩn

## Bối cảnh

`ui/src` là giao diện React 19 + Vite. Trước đây **mọi chuỗi tiếng Anh đều hardcode** trong JSX.
Giờ đã có một framework i18n nhỏ, tự viết, không phụ thuộc thư viện ngoài.

Bạn đang được giao **một domain**. Việc của bạn: Việt hóa domain đó.

## Kiến trúc i18n (đã xong, không sửa)

| File | Vai trò |
|---|---|
| `ui/src/i18n/types.ts` | Kiểu dữ liệu, `Locale = "en" \| "vi"` |
| `ui/src/i18n/core.ts` | `I18nProvider`, `useT()`, `useLocale()`, `useSetLocale()` |
| `ui/src/i18n/resolve.ts` | Nội suy `{name}` + số nhiều `_one` / `_other` |
| `ui/src/i18n/format.ts` | Định dạng ngày/giờ/số/tiền/thời lượng theo locale |
| `ui/src/i18n/static.ts` | `translate()` cho code ngoài React (module-level data) |
| `ui/src/i18n/index.ts` | Barrel export — import từ đây |
| `ui/src/i18n/locales/{en,vi}/<domain>.ts` | Catalogue theo domain |

**Provider đã được bọc quanh toàn bộ app** trong `ui/src/main.tsx`. Mọi component đều nằm trong provider.

## Cách dùng

Trong component:

```tsx
import { useT } from "@/i18n";

export function MyThing() {
  const t = useT();
  return <button title={t("team.saveAgent")}>{t("team.saveAgent")}</button>;
}
```

Ngoài React (dữ liệu module-level, ví dụ mảng tên bàn ghế trong `office/layouts.ts`):

```ts
import { translate } from "@/i18n";
const label = translate("office.deskLabel");
```

## Quy tắc đặt key

- Format: `<domain>.<camelCase>`, domain trùng tên file catalogue của bạn.
- Tên key mô tả **ý nghĩa**, không mô tả vị trí: `team.deleteAgent`, không `team.button3`.
- Cùng một nghĩa → **cùng một key**, dùng ở nhiều nơi. Không tạo `team.remove` và `team.delete` cho cùng một nút.
- Từ khoá: `save`, `cancel`, `delete`, `close`, `add`, `edit`, `copy`, `download`, `search`, `filter`, `run`, `stop`, `pause`, `resume`, `approve`, `reject`, `empty`, `loading`, `error` — nếu đã có sẵn trong `common.ts` thì **dùng lại key `common.*`**, đừng tạo key mới trùng nghĩa.
  - `common.ts` đã có sẵn: `common.save`, `common.cancel`, `common.delete`, `common.close`, `common.add`, `common.create`, `common.edit`, `common.search`, `common.filter`, `common.run`, `common.stop`, `common.pause`, `common.resume`, `common.approve`, `common.reject`, `common.loading`, `common.emptyTitle`, `common.noneYet`, `common.name`, `common.description`, `common.model`, `common.status`, `common.type`, `common.value`, `common.time`, `common.date`, `common.cost`, `common.tokens`, `common.total`, `common.history`, `common.summary`, `common.details`, `common.actions`, `common.example`, `common.count`, `common.optional`, `common.required`, `common.none`, `common.all`, `common.yes`, `common.no`, `common.confirm`, `common.enable`, `common.disable`, `common.enabled`, `common.disabled`, `common.open`, `common.rename`, `common.download`, `common.upload`, `common.settings`, `common.copy`, `common.copied`, `common.refresh`, `common.retry`, `common.apply`, `common.reset`, `common.done`, `common.back`, `common.next`, `common.previous`, `common.more`, `common.less`, `common.language`, `common.working`, `common.paused`, `common.menu`, `common.expand`, `common.collapse`, `common.sortBy`, `common.from`, `common.to`, `common.never`, `common.always`, `common.neverYet`, `common.readOnly`, `common.learnMore`, `common.notSet`, `common.unknown`, `common.you`, `common.me`, `common.nothingSelected`, `common.error`, `common.warning`, `common.success`, `common.itemsCount_one`, `common.itemsCount_other`.
  - **Hãy đọc `ui/src/i18n/locales/vi/common.ts` trước khi bắt đầu.**

## Quy tắc Việt hóa

- Dịch **nghĩa**, không dịch từng từ. Dùng câu tự nhiên của người Việt dùng phần mềm.
- Giữ nguyên: tên riêng (Zeus, Argus, Kronos, Pantheon), tên file, tên biến, mã lệnh, đường dẫn, placeholder kỹ thuật (`api.github.com`, `{{secret:NAME}}`, `--flag`), tên model.
- Giữ nguyên các token trong ngoặc nhọn `{...}` và `{{...}}` khi dịch.
- Văn phong UI: **ngắn, không viết hoa chữ cái đầu** (giống tiếng Anh gốc đang viết `sentence case`), không dấu chấm cuối.
- Nhãn nút: dùng động từ ngắn (`Lưu`, `Huỷ`, `Xoá`, `Thêm`, `Sửa`, `Chạy`).
- Giữ "bạn" để gọi người dùng (không dùng "quý khách").
- Thuật ngữ: agent → **agent** (giữ nguyên, người Việt dùng từ này), task → **task** hoặc **việc**, tool → **tool**, flow → **flow**, org → **tổ chức** (khi nói về tổ chức của agent), provider → **provider**, secret → **secret**, workspace → **workspace**, commit → **commit**, branch → **branch**, token → **token**, prompt → **prompt**.
- Nếu một thuật ngữ kỹ thuật rõ nghĩa hơn khi giữ nguyên tiếng Anh, hãy giữ nguyên.
- Số nhiều: tiếng Việt chỉ có một dạng. Với key có số lượng, dùng `_other` và bỏ `_one`:
  ```ts
  "team.agentCount_other": "{count} agent",
  ```
  Còn tiếng Anh thì cả hai:
  ```ts
  "team.agentCount_one": "{count} agent",
  "team.agentCount_other": "{count} agents",
  ```

## Quy tắc ngày giờ, số, tiền

**Không format thủ công.** Dùng helper trong `ui/src/i18n/format.ts`:

```tsx
import { useT, useLocale, formatDate, formatTime, formatRelative, formatNumber, formatCurrency, formatDuration } from "@/i18n";

const t = useT();
const locale = useLocale();
<span>{formatDate(locale, org.createdAt)}</span>
<span>{formatRelative(locale, turn.startedAt)}</span>
<span>{formatCurrency(locale, stats.costUsd)}</span>
```

Helper có sẵn: `formatDate`, `formatShortDate`, `formatDayMonth`, `formatTime`, `formatDateTime`, `formatWeekdayShort`, `formatWeekdayLong`, `formatNumber`, `formatCompact`, `formatCurrency`, `formatRelative`, `formatDuration`, `formatBytes`.

`locale` lấy từ `useLocale()`.

Nếu một chuỗi ghép nhiều phần (ví d. "3 agents · 12 tasks"), tách mỗi phần ra key riêng rồi ghép bằng template string.

## Thứ KHÔNG dịch

- Code, tên biến, tên hàm, tên file, import.
- Nội dung do người dùng nhập, dữ liệu từ server, tên agent do người dùng tạo.
- Text trong `<title>` của HTML? — Có, dịch.
- Comment trong code: **giữ tiếng Anh** (chúng là cho lập trình viên, không hiện ra UI).
- Chuỗi log, tên hàm API, path API.
- Chuỗi trong `engine/` (Python) — phạm vi của bạn chỉ là `ui/src`.

## Quy trình làm

1. Đọc `ui/src/i18n/locales/vi/common.ts` (để biết key có sẵn).
2. Đọc các file được giao. Liệt kê **mọi** chuỗi hiển thị cho người dùng:
   - Text node trong JSX: `>Some text<`
   - Attributes: `title`, `placeholder`, `aria-label`, `alt`, `label`, `description`
   - Chuỗi truyền vào component dưới dạng prop `title="..."`, `hint="..."`, `emptyText="..."`
   - Chuỗi trong object config dùng để render (ví dụ mảng các tab `{ value: "x", label: "Label" }`)
3. Tạo key trong `ui/src/i18n/locales/en/<domain>.ts` và bản dịch trong `ui/src/i18n/locales/vi/<domain>.ts`.
4. Sửa file nguồn: thay chuỗi bằng `t("...")`.
5. Chạy `cd ui && npx tsc --noEmit` — **phải sạch 0 lỗi**.
6. Chạy `cd ui && npx eslint src --quiet` cho các file bạn sửa.

## Ràng buộc quan trọng

- **Chỉ sửa các file được giao** + 2 file catalogue của bạn (`en/<domain>.ts`, `vi/<domain>.ts`).
- **KHÔNG sửa** `ui/src/i18n/index.ts`, `core.ts`, `resolve.ts`, `format.ts`, `types.ts`, `static.ts`, `main.tsx`, `locales/*/index.ts`, `locales/*/common.ts`, hay catalogue của domain khác. Chúng đã xong và đang dùng.
- **KHÔNG** thêm dependency mới vào `package.json`.
- **KHÔNG** đổi logic ứng dụng, chỉ đổi chuỗi hiển thị. Nếu thấy bug hãy ghi lại, đừng sửa.
- Giữ nguyên hành vi, layout, className.

## Báo cáo

Khi xong, trả về:
1. Danh sách key đã tạo (dạng `domain.key`).
2. Các file đã sửa.
3. Kết quả `tsc --noEmit` (số lỗi).
4. Những chuỗi bạn **không** dịch và lý do (ví dụ: string động không xác định được, dữ liệu server).
