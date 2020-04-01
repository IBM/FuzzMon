CC=gcc
CFLAGS=-I.
SHELL := /bin/bash


.PHONY: clean all

%.o: %.c
	$(CC) -c -o $@ $< $(CFLAGS)

all: create_file
	source ./setup_env.sh
	chmod +x ./create_file
	mv ./create_file /tmp/create_file

create_file: create_file.o
	$(CC) -o create_file create_file.o

install:
	npm i .

clean:
	rm -f ./create_file
	rm -f /tmp/create_file
	rm -f ./create_file.o
