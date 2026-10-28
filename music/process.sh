#!/bin/bash
# process.sh IN OUT SECONDS FADE: quita el silencio inicial, recorta, iguala volumen (primer minuto a -16 LUFS) y codifica MP3 128k
in="$1"; out="$2"; len="$3"; fade="$4"
trim="silenceremove=start_periods=1:start_threshold=-50dB"
I=$(ffmpeg -hide_banner -i "$in" -af "$trim,atrim=0:60,ebur128" -f null - 2>&1 | awk '/^ +I:/{v=$2} END{print v}')
gain=$(python3 -c "print(round(-16 - ($I), 2))")
ffmpeg -v error -y -i "$in" -af "$trim,atrim=0:$len,asetpts=N/SR/TB,volume=${gain}dB,alimiter=limit=0.89:level=false,afade=t=out:st=$(python3 -c "print($len-$fade)"):d=$fade" -ar 44100 -ac 2 -b:a 128k -map_metadata -1 "$out"
echo "$(basename "$in") first-minute I=$I gain=${gain}dB -> $(du -k "$out" | cut -f1) KB"
