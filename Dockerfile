FROM ubuntu:latest
LABEL authors="yannickstumpf"

ENTRYPOINT ["top", "-b"]