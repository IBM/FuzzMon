#include <stdio.h>
#include <string.h>

#define DST_FILE_NAME ("/tmp/fuzzMonShellInjectionTest")
#define FILE_CONTENT  ("This is a FuZzTest")

int main () {
 FILE *fp = NULL;
 char str[] = FILE_CONTENT;

 fp = fopen(DST_FILE_NAME , "w" );
 if (fp) {
  fwrite(str , sizeof(char), strlen(str) , fp );
  fclose(fp);
 }
 fp = NULL; 
 return 0;
}

