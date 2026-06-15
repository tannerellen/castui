# Castui
### A terminal UI for managing videos stored in AWS S3

A clean, keyboard-driven TUI for browsing, previewing, uploading, renaming, and managing videos in an S3 bucket.

## Requirements

- [Bun](https://bun.sh/) javascript runtime (only when running from source)
- [AWS CLI](https://aws.amazon.com/cli/) installed and configured with appropriate credentials
- `ffmpeg` — for generating video preview thumbnails
- One of the following for image preview display:
  - `kitten icat` (Kitty terminal)
  - `imgcat` (iTerm2)
  - `chafa` (any terminal with sixel/unicode art support)
- One of the following for clipboard support:
  - `wl-copy` (Wayland)
  - `xclip` or `xsel` (X11)
  - `pbcopy` (macOS)
- For file picker dialogs:
  - `zenity` (Linux)
  - `osascript` (macOS, built-in)

## Configuration

Castui requires a config file at `~/.config/castui/config.json`. Create the directory and file before launching:

```bash
mkdir -p ~/.config/castui
```

Example `config.json`:

```json
{
  "aws": {
    "bucket": "your-s3-bucket-name",
    "region": "your-aws-region"
  },
  "watchUrl": "your-watch-domain.example.com",
  "pageSize": 50,
  "filePickerCommand": "zenity --file-selection --title='Select video'",
  "playback": {
    "autoplay": false
  }
}
```

| Field | Description |
|---|---|
| `aws.bucket` | The S3 bucket containing your videos |
| `aws.region` | The AWS region of your bucket (e.g. `us-east-1`) |
| `watchUrl` | Base domain used to build video watch URLs |
| `pageSize` | Number of videos to load at a time (default: `50`) |
| `filePickerCommand` | Shell command that outputs a file path to stdout. Omit to use the default (`zenity` on Linux, `osascript` on macOS) |
| `playback.autoplay` | If `true`, appends `autoplay=1` to the watch URL when opening a video (default: `false`) |

## Installation

### Binary Install
Download the latest binary from the [releases](../../releases) page, then copy it somewhere in your `PATH`:

```bash
cp castui /usr/local/bin/castui
chmod +x /usr/local/bin/castui
```

Then launch with:

```bash
castui
```

### Run From Source
Ensure [Bun](https://bun.sh/) is installed, clone the repo, then run:

```bash
git clone <repo-url>
cd castui
bun index.js
```

## Command Line Usage

Castui can be used non-interactively from the command line for scripting and automation.

### Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--upload <path>` | `-u` | Upload a file without launching the UI |
| `--interactive` | `-i` | Open the file picker to select a file to upload |
| `--permanent` | `-p` | Upload the file as permanent (no expiry) |
| `--clipboard` | `-c` | Copy the playback URL to clipboard after upload |
| `--version` | `-v` | Print the version and exit |
| `--help` | `-h` | Print help and exit |

> `--permanent` and `--clipboard` only apply when uploading. `--clipboard` always produces a URL without autoplay regardless of the config setting.

### Examples

```bash
# Upload a file
castui --upload /path/to/video.mp4

# Upload a file and copy the playback URL to clipboard
castui --upload /path/to/video.mp4 --clipboard

# Upload a file as permanent and copy URL
castui --upload /path/to/video.mp4 --permanent --clipboard

# Open file picker to select a file, then upload
castui --upload --interactive

# Open file picker, upload as permanent, copy URL
castui --upload --interactive --permanent --clipboard
```

### Navigation
| Key | Action |
|---|---|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `ctrl+d` | Page down |
| `ctrl+u` | Page up |
| `q` / `ctrl+c` | Quit |
| `?` | Show help |

### Video Actions
| Key | Action |
|---|---|
| `enter` | Preview video thumbnail |
| `v` | Open video in browser |
| `c` | Copy watch URL to clipboard |
| `r` | Rename video |
| `d` | Delete video |
| `p` | Toggle permanent / expires |
| `u` | Upload a new video |
| `m` | Load more videos |
| `ctrl+r` | Refresh list |

### Filter
| Key | Action |
|---|---|
| `/` | Enter filter mode |
| `enter` | Commit filter (re-enables navigation) |
| `esc` | Clear filter |

### Dialogs
| Key | Action |
|---|---|
| `esc` | Close dialog |

