#!/usr/bin/env bash
# Requires gpu-screen-recorder: https://github.com/nowrep/gpu-screen-recorder

defaultSink=$(pactl get-default-sink)
videoCodec="auto" # auto|h264|hevc|hevc_10buit
videoCodecPortal="auto"
videoCodecRegion="auto"
qualityScreen="ultra" # quality  preset  (medium,  high,  very_high,  ultra) for QP/VBR mode, or bitrate (kbps) for CBR mode (default:very_high).
qualityPortal="ultra" # quality  preset  (medium,  high,  very_high,  ultra) for QP/VBR mode, or bitrate (kbps) for CBR mode (default:very_high).
qualityRegion="ultra" # quality  preset  (medium,  high,  very_high,  ultra) for QP/VBR mode, or bitrate (kbps) for CBR mode (default:very_high).
# bitrateMode="auto" # auto|qp|vbr|cbr | Bitrate mode (default: auto → qp). CBR recommended for replay buffer
videoFormat="mp4"
outputDir=""
outputFile=""
notifyId="/tmp/recordID"

# Function to check if recording is active
checkRecording() {
    pgrep -f "gpu-screen-recorder" >/dev/null
}

# Function to start screen recording
startRecording() {
    if checkRecording; then
        echo "A recording is already in progress."
        exit 1
    fi

    target="$2"

    if [ "$target" == "screen" ]; then
        outputDir="$3"
    elif [ "$target" == "portal" ]; then
        outputDir="$3"
    elif [ "$target" == "region" ]; then
        outputDir="$3"
    else
        echo "Usage: $0 start {screen <monitor_name> | portal | region} <output_directory>"
        exit 1
    fi

    # Set a default output directory if not provided
    outputDir="${outputDir:-$HOME/Videos/Screencast}"

    # Expand ~ to $HOME if present in outputDir
    outputDir="${outputDir/#\~/$HOME/}"

    # Ensure output directory exists
    if [ ! -d "$outputDir" ]; then
        mkdir -p "$outputDir"
        echo "Created output directory: $outputDir"
    fi

    # Generate output filename and path
    outputFile="recording_$(date +%Y-%m-%d_%H-%M-%S).$videoFormat"
    outputPath="$outputDir/$outputFile"

    echo "Target: $target"
    echo "Output dir: $outputDir"
    echo "Output file: $outputPath"

    # Start screen recording
    if [ "$target" == "screen" ]; then
        gpu-screen-recorder \
            -w screen \
            -k "$videoCodec" \
            -f 60 \
            -q "$qualityScreen" \
            -c "$videoFormat" \
            -a "$defaultSink.monitor" \
            -fallback-cpu-encoding yes \
            -o "$outputPath" &
    elif [ "$target" == "portal" ]; then
        gpu-screen-recorder \
            -w portal \
            -k "$videoCodecPortal" \
            -f 60 \
            -q "$qualityPortal" \
            -fm content \
            -c "$videoFormat" \
            -a "$defaultSink.monitor" \
            -fallback-cpu-encoding yes \
            -restore-portal-session yes \
            -o "$outputPath" &
    elif [ "$target" == "region" ]; then
        # Use slurp to select a region and format output as WxH+X+Y
        region=$(slurp -f "%wx%h+%x+%y")
        if [ -z "$region" ]; then
            echo "Error: No region selected."
            exit 1
        fi

        echo "Selected region: $region"

        gpu-screen-recorder \
            -w region \
            -region "$region" \
            -k "$videoCodecRegion" \
            -f 60 \
            -q "$qualityRegion" \
            -c "$videoFormat" \
            -a "$defaultSink.monitor" \
            -fallback-cpu-encoding yes \
            -o "$outputPath" &
    fi

    echo "Recording started. Saving to $outputPath"
    echo "$outputPath" >/tmp/last_recording_path

    # notify-send "Screen Recording 📽️" "Recording started.\nOutput will be saved to\n$outputPath" -t 3000 -i "video"
}

# Function to stop screen recording
stopRecording() {
    if ! checkRecording; then
        echo "No recording in progress."
        exit 1
    fi

    pkill -SIGINT -f gpu-screen-recorder
    while pgrep -f "gpu-screen-recorder" >/dev/null; do
        sleep 0.5
    done

    outputPath=$(cat /tmp/last_recording_path 2>/dev/null)

    if [ -z "$outputPath" ] || [ ! -f "$outputPath" ]; then
        notify-send "Recording stopped" "No recent recording found." \
            -i video \
            -a "Screen Recorder" \
            -t 10000
        exit 1
    fi

    notify-send "Recording stopped" "Saved to: $outputPath" \
        -i video \
        -a "Screen Recorder" \
        -t 10000 \
        --action="scriptAction:-xdg-open $(dirname "$outputPath")=Open Directory" \
        --action="scriptAction:-xdg-open $outputPath=Play"
}

# Handle script arguments
case "$1" in
start)
    startRecording "$@"
    ;;
stop)
    stopRecording
    ;;
status)
    if checkRecording; then
        echo "recording"
    else
        echo "not recording"
    fi
    ;;
*)
    echo "Usage: $0 {start [screen <monitor_name> | portal | region] <output_directory> | stop | status}"
    exit 1
    ;;
esac
