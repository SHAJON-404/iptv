# 📺 IPTV Channel Collection

## 🌍 1220+ Live TV Channels in JSON Format

A large IPTV channel collection stored in JSON format, containing 1220+ live TV channels from multiple countries and categories.

Web Player: https://tools.shajon.dev/iptv

All channels are collected from publicly available open-source IPTV repositories and publicly accessible sources.

---

## 📂 Data Structure

Each channel is stored in JSON format:

```json
{
  "name": "Ananda TV",
  "logo": "https://example.com/logo.png",
  "group": "Bangla",
  "url": "https://example.com/stream.m3u8"
}
```

### Fields

| Field | Description |
|---------|-------------|
| name | Channel name |
| logo | Channel logo URL |
| group | Channel category or language |
| url | Live stream URL |

---

## 📄 JSON Source

Raw JSON File:

https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/channels.json

Repository:

https://github.com/SHAJON-404/iptv

Web Player:

https://tools.shajon.dev/iptv

---

## 📊 Collection Information

- 1220+ Channels
- JSON-Based Structure
- Multiple Languages
- Multiple Countries
- Live Stream URLs
- Channel Logos Included
- Category-Based Grouping
- Easy API Integration
- Easy Web Player Integration

---

## 📂 Categories

Examples:

- Bangla
- Sports
- News
- Movies
- Entertainment
- Music
- Kids
- Documentary
- Religious
- International

---

## 💻 Usage Example

### JavaScript

```js
fetch("https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/channels.json")
  .then(res => res.json())
  .then(data => {
    console.log(data);
  });
```

### Python

```python
import requests

channels = requests.get(
    "https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/channels.json"
).json()

print(channels[0])
```

---

## ⚠️ Disclaimer

This repository does not host, store, retransmit, or own any television channels or media content.

The JSON file only contains publicly available stream links collected from open-source IPTV repositories and public internet sources.

Channel availability may change, expire, or stop working at any time.

If you are the copyright owner of any content and would like it removed, please open an issue.

---

## ❤️ Credits

Special thanks to all IPTV open-source repository maintainers and contributors whose publicly available playlists and stream sources make this collection possible.

---

## 📄 License

Licensed under the GNU General Public License v3.0 (GPL-3.0).

You may:

- Use
- Modify
- Distribute
- Fork
- Self Host

under the terms of the GPL v3 License.

License:
https://www.gnu.org/licenses/gpl-3.0.en.html

---

## ⭐ Support

If this project helps you:

- Star the repository
- Fork the repository
- Share the project
- Contribute improvements

---

## 🔗 Links

Repository:
https://github.com/SHAJON-404/iptv

Raw JSON:
https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/channels.json
