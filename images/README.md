# Create gifs

## Convert mov to gif

```
ffmpeg -i vscode-phabricator-accepted-diffs.mov -vf drawtext='fontfile=/System/Library/Fonts/Avenir\ Next.otf: text=Ready to Land Diffs: fontcolor=white: fontsize=100: box=1: boxcolor=black@0.75: boxborderw=20: x=(w-text_w)/2: y=(h-text_h)-80,fps=16,setpts=1*PTS,scale=1024:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse' -loop 0 vscode-phabricator-accepted-diffs-test.gif
```

```
ffmpeg -i vscode-phabricator-autocomplete.mov -vf drawtext='fontfile=/System/Library/Fonts/Avenir\ Next.otf: text=Autocomplete: fontcolor=white: fontsize=100: box=1: boxcolor=black@0.75: boxborderw=20: x=(w-text_w)/2: y=20,fps=16,setpts=0.5*PTS,scale=1024:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse' -loop 0 vscode-phabricator-autocomplete-test.gif
```

## Combine gifs

Use https://ezgif.com/maker
