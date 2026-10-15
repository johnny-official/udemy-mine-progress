(() => {
  'use strict';

  const dictionaries = {
    vi: {
      'page.title': 'Tiến độ Udemy của tôi',
      'header.note': 'Riêng cho máy tính này. Không dùng tiến độ tài khoản chung.',
      'summary.label': 'Tổng quan',
      'course.count': 'Khóa học',
      'lecture.count': 'Video đã lưu',
      'saving': 'Đang lưu local',
      'continue.learning': 'Tiếp tục học',
      'recent': 'Gần đây nhất',
      'empty.title': 'Chưa có tiến độ',
      'empty.text': 'Mở một video Udemy, extension sẽ tự động lưu vị trí sau khi phát.',
      'settings': 'Cài đặt tự động',
      'seek.title': 'Tự khôi phục thời điểm xem',
      'seek.help': 'Seek tới giây đã lưu của từng video',
      'jump.title': 'Trở về bài gần nhất',
      'jump.help': 'Khi mở khóa mới trong tab từ Udemy',
      'backup': 'Sao lưu dữ liệu',
      'export': '↓ Xuất JSON',
      'import': '↑ Nhập JSON',
      'clear': 'Xóa toàn bộ tiến độ trên máy này',
      'privacy': 'Không thu thập email, mật khẩu hoặc gửi dữ liệu lên server.',
      'language': 'Ngôn ngữ',
      'today': 'Hôm nay',
      'yesterday': 'Hôm qua',
      'daysAgo': '{count} ngày trước',
      'video': 'Video {id}',
      'lesson': 'Bài {id}',
      'savedInfo': 'Bài {id} • {time}{duration} • {count} video đã lưu',
      'duration': ' / {time}',
      'noVideo': 'Chưa có video được lưu',
      'resume': '▶ Tiếp tục',
      'details': 'Xem các bài ({count}) ▾',
      'savedSettings': 'Đã lưu cài đặt.',
      'settingsError': 'Không lưu được cài đặt: {error}',
      'exported': 'Đã xuất {count} bản ghi.',
      'exportError': 'Không thể xuất dữ liệu: {error}',
      'fileSize': 'Tệp phải nhỏ hơn 5 MB.',
      'badBackup': 'Không đúng định dạng sao lưu.',
      'tooMany': 'Tệp có quá nhiều bản ghi.',
      'imported': 'Đã nhập/cập nhật {count} bản ghi. Dữ liệu mới hơn trên máy được giữ lại.',
      'importError': 'Nhập thất bại: {error}',
      'confirmClear': 'Xóa TẤT CẢ tiến độ Udemy lưu trên máy này? Nên xuất JSON trước. Không thể hoàn tác.',
      'deleted': 'Đã xóa {count} bản ghi. Tải lại tab Udemy nếu đang mở.',
      'deleteError': 'Không thể xóa tiến độ: {error}',
      'readError': 'Không đọc được dữ liệu: {error}',
      'resumeTitle': 'Tiến độ riêng của bạn đã được lưu',
      'resumeDesc': 'Bài {id}, tại {time}. Tiếp tục từ vị trí của máy này?',
      'resumeMine': 'Tiếp tục bài của tôi',
      'later': 'Để sau'
    },
    en: {
      'page.title': 'My Udemy Progress',
      'header.note': 'Only on this computer. Does not use shared account progress.',
      'summary.label': 'Overview',
      'course.count': 'Courses',
      'lecture.count': 'Videos saved',
      'saving': 'Saved locally',
      'continue.learning': 'Continue learning',
      'recent': 'Most recent',
      'empty.title': 'No progress yet',
      'empty.text': 'Open a Udemy video; the extension will automatically save your position during playback.',
      'settings': 'Automatic settings',
      'seek.title': 'Restore playback position',
      'seek.help': 'Seek to each video’s saved timestamp',
      'jump.title': 'Return to most recent lesson',
      'jump.help': 'When opening a new course in a tab from Udemy',
      'backup': 'Back up data',
      'export': '↓ Export JSON',
      'import': '↑ Import JSON',
      'clear': 'Delete all progress on this computer',
      'privacy': 'No email or password is collected, and no data is sent to a server.',
      'language': 'Language',
      'today': 'Today',
      'yesterday': 'Yesterday',
      'daysAgo': '{count} days ago',
      'video': 'Video {id}',
      'lesson': 'Lesson {id}',
      'savedInfo': 'Lesson {id} • {time}{duration} • {count} videos saved',
      'duration': ' / {time}',
      'noVideo': 'No saved videos',
      'resume': '▶ Resume',
      'details': 'View lessons ({count}) ▾',
      'savedSettings': 'Settings saved.',
      'settingsError': 'Could not save settings: {error}',
      'exported': 'Exported {count} records.',
      'exportError': 'Could not export data: {error}',
      'fileSize': 'File must be smaller than 5 MB.',
      'badBackup': 'Invalid backup format.',
      'tooMany': 'File contains too many records.',
      'imported': 'Imported/updated {count} records. Newer data on this computer was kept.',
      'importError': 'Import failed: {error}',
      'confirmClear': 'Delete ALL Udemy progress saved on this computer? Export JSON first. This cannot be undone.',
      'deleted': 'Deleted {count} records. Reload any open Udemy tab.',
      'deleteError': 'Could not delete progress: {error}',
      'readError': 'Could not read data: {error}',
      'resumeTitle': 'Your private progress is saved',
      'resumeDesc': 'Lesson {id}, at {time}. Continue from this computer’s position?',
      'resumeMine': 'Continue my lesson',
      'later': 'Later'
    }
  };

  // ponytail: Support only Vietnamese and English; add a dictionary when another language is requested.
  const supported = Object.keys(dictionaries);

  function validLanguage(value) {
    return supported.includes(value) ? value : null;
  }

  function initialLanguage() {
    return 'en';
  }

  function create(language) {
    const lang = validLanguage(language) || 'en';
    return {
      language: lang,
      t(key, values = {}) {
        return (dictionaries[lang][key] || dictionaries.en[key] || key)
          .replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
      }
    };
  }

  globalThis.UdemyMineI18n = {dictionaries, supported, validLanguage, initialLanguage, create};
  if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.UdemyMineI18n;
})();
