# Create gifs

## Convert mov to gif

```
ffmpeg -i vscode-phabricator-accepted-diffs.mp4 -vf drawtext='fontfile=/System/Library/Fonts/Avenir\ Next.otf: text=Accepted Diffs: fontcolor=white: fontsize=75: box=1: boxcolor=black@0.75: boxborderw=20: x=(w-text_w)/2: y=(h-text_h)-80,fps=16,setpts=1*PTS,scale=1024:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse' -loop 0 vscode-phabricator-accepted-diffs.gif
```

```
ffmpeg -i vscode-phabricator-autocomplete.mp4 -vf drawtext='fontfile=/System/Library/Fonts/Avenir\ Next.otf: text=Autocomplete: fontcolor=white: fontsize=75: box=1: boxcolor=black@0.75: boxborderw=20: x=(w-text_w)/2: y=20,fps=16,setpts=0.5*PTS,scale=1024:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse' -loop 0 vscode-phabricator-autocomplete.gif
```

```
ffmpeg -i vscode-phabricator-notify.mp4 -vf drawtext='fontfile=/System/Library/Fonts/Avenir\ Next.otf: text=Notify: fontcolor=white: fontsize=75: box=1: boxcolor=black@0.75: boxborderw=20: x=(w-text_w)/2: y=20,fps=16,setpts=1*PTS,scale=1024:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse' -loop 0 vscode-phabricator-notify.gif
```

## Combine gifs

```
gifsicle vscode-phabricator-autocomplete.gif vscode-phabricator-accepted-diffs.gif vscode-phabricator-notify.gif > vscode-phabricator-screencast.gif
```
