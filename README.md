# Udemy Mine Progress

[English](#english) · [Tiếng Việt](#tiếng-việt)

## English

Udemy Mine Progress is a dependency-free Chrome extension that saves and restores Udemy video positions per browser profile. No backend, additional account, build step, or automatic cross-device synchronization.

Independent project; not affiliated with or endorsed by Udemy. **Not yet verified against a real signed-in Udemy account.** Test before relying on it.

### Features

- Saves progress approximately every five seconds during playback, and on pause, seek, end, and lesson changes.
- Restores timestamps and supports resuming the most recent lesson while respecting deliberate lesson selection.
- Lists saved courses and lessons in the popup.
- Imports and exports JSON; imports preserve the newer record when there is a conflict.
- Switches between English and Vietnamese in the popup, including the on-page resume prompt.
- Stores data locally in `chrome.storage.local`; it does not sync across devices.

### Install and use

1. Download the repository using **Code → Download ZIP** and extract it, or clone it.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** → **Load unpacked**.
4. Select the directory containing `manifest.json`, not the ZIP file.
5. Pin the extension, open a Udemy video, and play it to start saving progress.

Node.js is not needed to use the extension; it is only needed for tests. To update, click **Reload** on the extensions page and reload open Udemy tabs. Export a JSON backup before updating or uninstalling.

Open the popup to resume learning, view individual videos, toggle automatic restoration or navigation, and back up data. Direct links to a lesson from outside Udemy are not automatically redirected; use the resume prompt or popup button instead.

Choose **Language → English / Tiếng Việt** to change the interface immediately. The choice is saved in the browser and also updates an open Udemy resume prompt. **English is the default regardless of browser locale.** A saved Vietnamese selection is retained and used until changed. Course content and Udemy’s own interface are not translated.

### Privacy and stored data

- Uses the `storage` permission. Content scripts run on `https://*.udemy.com/*` to track HTML5 video and course navigation.
- No backend, analytics, CDN-hosted code, or collection of email, passwords, or cookies.
- The extension does not send progress to a server; **Udemy may continue to save account progress as usual**.
- Progress belongs to the extension installation/profile, not an individual Udemy account. Switching accounts in the same profile still uses the same local data.
- Uninstalling the extension or deleting the profile can lose data. Export JSON regularly; backups contain course names, lesson IDs, and learning history and should not be shared publicly.
- JSON backups contain progress only, not settings or language. Imports are limited to 5 MiB and 10,000 records; invalid records are skipped.

| Storage key | Contents |
| --- | --- |
| `ump:v1:c:<course-slug>` | Course information and most recent lesson |
| `ump:v1:l:<course-slug>:<lecture-id>` | Timestamp, duration, locally tracked completion status |
| `ump:v1:settings` | Automatic behavior settings |
| `umpLanguage` | Interface language |

### Limitations

- Changes to Udemy’s player or URLs, and videos in iframes, may break tracking.
- Does not change Udemy account certificates or lesson completion status.
- Across multiple tabs studying the same course, the most recently recorded lesson determines the resume button; tabs on the same video may overwrite each other’s timestamp.
- An abrupt browser shutdown may lose progress that has not yet been saved. Automatic restoration also depends on the player.
- Does not bypass course access, DRM, or account restrictions. Users must follow Udemy’s terms.

### Development and tests

Plain JavaScript, CSS, and HTML; no package manager or build step.

```sh
node tests/core.test.js
node tests/content.test.js
node tests/localization.test.js
```

| File | Role |
| --- | --- |
| `manifest.json` | Manifest V3 and execution scope |
| `core.js` | URLs, timestamps, and imported-data validation |
| `i18n.js` | English/Vietnamese dictionaries and message interpolation |
| `content.js`, `content.css` | Video tracking, restoration, and prompt |
| `popup.html`, `popup.js`, `popup.css` | Interface, settings, and backups |
| `tests/` | Dependency-free Node.js tests |

Before release, manually test changing the language and reopening the popup, changing it while a prompt is visible, restoration after reload, SPA lesson navigation, JSON import/export, and canceling a delete action. Use two Chrome profiles to verify independent progress. Mock-based tests do not replace testing on a real Udemy account.

### Contributions

Open an Issue in the repository to report a bug or suggest a feature. Include Chrome/extension versions, reproduction steps, and expected and actual results. Do not attach cookies, login details, or personal backups. For security issues, use a private reporting channel if the maintainer has enabled one; do not publish sensitive data.

For a Pull Request, fork the repository, create a branch, make a focused change, run the tests above, and describe how you tested it. When adding interface strings, update both dictionaries in `i18n.js`. Prefer built-in browser APIs and avoid unnecessary dependencies.

### CI/CD and GitHub releases

GitHub Actions runs syntax checks, all Node.js tests, a packaging self-check, and ZIP validation on pushes and pull requests. Download the tested ZIP from the workflow's `extension-package` artifact; artifacts expire after 14 days. No dependencies or build framework are installed.

A pushed `vX.Y.Z` tag publishes a **GitHub Release** with the same tested ZIP, `SHA256SUMS.txt`, and English installation/update instructions plus GitHub-generated change notes. PR titles and commit messages remain in their original language: write them in English for consistent release notes. Chrome Web Store publishing is not included.

**First-time repository setup**

- Push this project to your GitHub repository and enable Actions. No personal access token or custom secret is needed; the release job uses the built-in `GITHUB_TOKEN` with `contents: write`.
- Protect your default branch: require PR review and the **Test and package** status check. Restrict creation, update, and deletion of `v*` tags to release maintainers using repository rulesets where available.
- Review workflow changes carefully. Actions are pinned to commit SHAs; update those pins deliberately. CI/PR jobs have read-only permissions and checkout does not persist credentials.

**Publish a version**

1. Update `manifest.json` to a three-part version such as `1.0.1`, submit a PR, and wait for CI to pass.
2. Manually test in Chrome with Udemy, merge, and check out the merged commit locally.
3. Create and push a matching annotated tag:

   ```sh
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin v1.0.1
   ```

The tag must exactly match the manifest version. Prerelease suffixes are not supported. Release jobs do not cancel each other for the same tag, and an existing release is not silently overwritten. If publishing fails before a release exists, rerun the failed job; if a release already exists, inspect it before taking action. For a published defect, ship a new patch version rather than moving an existing tag.

**Local packaging** (Python 3 required; not needed to use the extension):

```sh
python scripts/release.py --self-test
python scripts/release.py --tag v1.0.0
```

Use the current manifest version in the command. Packages are written to ignored `dist/`; only an explicit runtime/documentation/license allowlist is included, with `manifest.json` at the ZIP root. ZIP metadata is fixed for reproducibility with the same toolchain. The release job verifies the checksum before publishing; a checksum is an integrity check, not a digital signature.

### License

Copyright 2026 Johnny Tran. Licensed under the [Apache License, Version 2.0](LICENSE).

---

## Tiếng Việt

Udemy Mine Progress là tiện ích Chrome không phụ thuộc thư viện bên thứ ba, giúp lưu và khôi phục vị trí video Udemy riêng cho từng trình duyệt/profile. Không có backend, tài khoản bổ sung, bước build hay tự động đồng bộ giữa các thiết bị.

Dự án độc lập, không liên kết hay được Udemy bảo trợ. **Hiện chưa được kiểm thử trên tài khoản Udemy thật đã đăng nhập.** Hãy thử trước khi tin cậy sử dụng.

### Tính năng

- Lưu tiến độ khoảng mỗi 5 giây khi phát video, đồng thời lưu khi tạm dừng, tua, kết thúc và chuyển bài.
- Khôi phục timestamp, hỗ trợ tiếp tục bài gần nhất và tôn trọng việc chủ động chọn bài khác.
- Hiển thị khóa học và video đã lưu trong popup.
- Nhập/xuất JSON; khi có xung đột, giữ bản ghi mới hơn.
- Chuyển English/Tiếng Việt trong popup, bao gồm lời nhắc tiếp tục trên trang Udemy.
- Lưu dữ liệu cục bộ bằng `chrome.storage.local`; không đồng bộ giữa các thiết bị.

### Cài đặt và sử dụng

1. Tải mã nguồn bằng **Code → Download ZIP** trên GitHub rồi giải nén, hoặc clone repository.
2. Mở `chrome://extensions` trong Chrome.
3. Bật **Developer mode** → **Load unpacked**.
4. Chọn thư mục chứa `manifest.json`, không chọn file ZIP.
5. Ghim tiện ích, mở video Udemy và phát để bắt đầu lưu tiến độ.

Không cần Node.js để sử dụng; Node.js chỉ cần cho kiểm thử. Khi cập nhật, nhấn **Reload** trên trang quản lý extension và tải lại các tab Udemy đang mở. Hãy xuất JSON trước khi cập nhật hoặc gỡ tiện ích.

Mở popup để tiếp tục học, xem từng video, bật/tắt tự khôi phục hoặc tự chuyển bài và sao lưu dữ liệu. Liên kết trực tiếp đến bài học từ ngoài Udemy không bị tự động chuyển hướng; hãy dùng lời nhắc tiếp tục hoặc nút trong popup.

Chọn **Language → English / Tiếng Việt** để đổi giao diện ngay. Lựa chọn được lưu trong trình duyệt và cập nhật cả lời nhắc Udemy đang mở. **Mặc định luôn là English, bất kể ngôn ngữ trình duyệt.** Lựa chọn Tiếng Việt đã lưu vẫn được giữ và sử dụng cho đến khi người dùng đổi. Tiện ích không dịch nội dung khóa học hay giao diện của Udemy.

### Quyền riêng tư và dữ liệu lưu trữ

- Sử dụng quyền `storage`. Content script chạy trên `https://*.udemy.com/*` để theo dõi video HTML5 và điều hướng khóa học.
- Không có backend, analytics, mã tải từ CDN, hay thu thập email, mật khẩu hoặc cookie.
- Extension không gửi tiến độ lên máy chủ; **Udemy vẫn có thể tự lưu tiến độ tài khoản như bình thường**.
- Tiến độ thuộc bản cài extension/profile, không thuộc từng tài khoản Udemy. Đổi tài khoản trong cùng profile vẫn dùng chung dữ liệu cục bộ.
- Gỡ extension hoặc xóa profile có thể làm mất dữ liệu. Hãy xuất JSON thường xuyên; bản sao lưu chứa tên khóa học, ID bài và lịch sử học, không nên công khai.
- JSON chỉ sao lưu tiến độ, không gồm cài đặt và ngôn ngữ. Giới hạn nhập là 5 MiB và 10.000 bản ghi; bản ghi không hợp lệ bị bỏ qua.

| Khóa lưu trữ | Nội dung |
| --- | --- |
| `ump:v1:c:<course-slug>` | Thông tin khóa học và bài gần nhất |
| `ump:v1:l:<course-slug>:<lecture-id>` | Timestamp, thời lượng, trạng thái hoàn thành cục bộ |
| `ump:v1:settings` | Cài đặt tự động |
| `umpLanguage` | Ngôn ngữ giao diện |

### Giới hạn

- Thay đổi player/URL của Udemy hoặc video trong iframe có thể khiến tính năng không hoạt động.
- Không thay đổi chứng chỉ hay trạng thái hoàn thành bài học trên tài khoản Udemy.
- Khi nhiều tab cùng học một khóa, bài được ghi gần nhất quyết định nút tiếp tục; nhiều tab cùng một video có thể ghi đè timestamp.
- Đóng trình duyệt đột ngột có thể làm mất tiến độ chưa kịp lưu. Tự khôi phục còn phụ thuộc player.
- Không vượt quyền truy cập khóa học, DRM hay giới hạn tài khoản. Người dùng phải tuân thủ điều khoản Udemy.

### Phát triển và kiểm thử

Mã nguồn JavaScript/CSS/HTML thuần, không cần package manager hoặc bước biên dịch.

```sh
node tests/core.test.js
node tests/content.test.js
node tests/localization.test.js
```

| Tệp | Vai trò |
| --- | --- |
| `manifest.json` | Manifest V3 và phạm vi thực thi |
| `core.js` | URL, timestamp và kiểm tra dữ liệu nhập |
| `i18n.js` | Từ điển Anh/Việt và nội suy thông báo |
| `content.js`, `content.css` | Theo dõi video, khôi phục và lời nhắc |
| `popup.html`, `popup.js`, `popup.css` | Giao diện, cài đặt và sao lưu |
| `tests/` | Kiểm thử Node.js không phụ thuộc thư viện |

Trước khi phát hành, kiểm tra thủ công việc đổi ngôn ngữ rồi mở lại popup, đổi ngôn ngữ khi lời nhắc đang hiện, khôi phục sau reload, chuyển bài trong SPA, nhập/xuất JSON và hủy thao tác xóa. Dùng hai Chrome profile để kiểm tra tiến độ độc lập. Kiểm thử mô phỏng không thay thế việc thử trên tài khoản Udemy thật.

### Đóng góp

Mở Issue trong repository để báo lỗi hoặc đề xuất tính năng. Ghi phiên bản Chrome/extension, bước tái hiện, kết quả mong đợi và thực tế. Không đính kèm cookie, thông tin đăng nhập hay bản sao lưu cá nhân. Với vấn đề bảo mật, dùng kênh báo cáo riêng nếu người duy trì đã bật; không công khai dữ liệu nhạy cảm.

Để gửi Pull Request: fork repository, tạo nhánh, sửa đúng phạm vi, chạy các kiểm thử trên và mô tả cách kiểm tra. Khi thêm chuỗi giao diện, cập nhật cả hai từ điển trong `i18n.js`. Ưu tiên API trình duyệt có sẵn và tránh thêm dependency không cần thiết.

### Giấy phép

Bản quyền © 2026 Johnny Tran. Cấp phép theo [Apache License, Version 2.0](LICENSE).
