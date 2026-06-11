# vnpt-harness-cli

CLI public để cài đặt, cập nhật, và di trú bộ VNPT Harness vào project.
Package này chỉ chứa CLI, không chứa payload private của harness.

## Quick Start

Cài CLI từ GitHub:

```bash
npm install -g github:truongqv12/harness-cli --install-links=true
vnpt-harness --version
```

Trên Windows, luôn dùng `--install-links=true` khi cài từ Git source. Nếu không,
npm có thể tạo link tới thư mục git tạm và CLI sẽ lỗi `MODULE_NOT_FOUND` sau khi
thư mục tạm bị dọn.

## Cấu hình Source Mặc định

Thiết lập source private một lần:

```bash
vnpt-harness config set source gitlab:<gitlab-host>/<group>/<vnpt-it-harness-repo>
```

Sau đó có thể init project mà không cần truyền `--source` mỗi lần:

```bash
vnpt-harness init --release latest --yes
```

Có thể override theo từng lệnh:

```bash
vnpt-harness init --source gitlab:<gitlab-host>/<group>/<vnpt-it-harness-repo> --release latest --yes
```

Hoặc dùng biến môi trường cho session hiện tại:

```bash
export VNPT_HARNESS_SOURCE="gitlab:<gitlab-host>/<group>/<vnpt-it-harness-repo>"
```

PowerShell:

```powershell
$env:VNPT_HARNESS_SOURCE = "gitlab:<gitlab-host>/<group>/<vnpt-it-harness-repo>"
```

## Sử dụng Local Bundle

Khi phát triển hoặc test bằng bundle local:

```bash
vnpt-harness init --kit-path /path/to/private-bundle --release local --yes
```

## Lệnh Chính

- `init`: cài hoặc cập nhật harness files trong project hiện tại.
- `install`: alias tương thích cho `init`.
- `update`: cập nhật package CLI.
- `migrate`: di trú harness assets sang agent khác, ví dụ Codex.
- `doctor`: kiểm tra trạng thái CLI, provider, và project.
- `config`: đọc hoặc ghi cấu hình CLI.

## Kiểm tra Nhanh

```bash
vnpt-harness --version
vnpt-harness config list
vnpt-harness doctor
```

## Lưu ý Bảo mật

Không hardcode host, token, hoặc credential nội bộ vào public CLI repo. Source
private nên đi qua `vnpt-harness config set source`, `VNPT_HARNESS_SOURCE`, hoặc
`--source` trong môi trường nội bộ.
