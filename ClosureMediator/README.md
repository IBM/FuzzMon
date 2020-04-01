## Requirements: ##
Already built jar with [Google Closure Compiler](https://github.com/google/closure-compiler). No modifications required.

## Building closure-compiler: ##
In the closure-compiler root directory run:

```../mvn/bin/mvn -DskipTests [-T 5C] -pl externs/pom.xml,pom-main.xml,pom-main-shaded.xml```

where 5 is the numebr of threads per core

## Building ClosureMediator: ##
1. Open the project with intellij
2. Go to project settings (CTRL + ALT + SHIFT + S)
3. Make sure that closure-compiler points to the compiled jar of closure - closure-compiler-1.0-SNAPSHOT.jar (under 'Libraries' tab)
4. Make sure there is a ClosureMediator.jar under the "Artifacts" tab
5. From the top menu, Build -> Build Artifacts...
6. Copy ClosureMediator.jar to the root directory of ClosureMediator
7. Set the environment variable CLOSUREMOD_DIR to point to the root directory of ClosureMediator (the directory with the file ClosureMediator.jar)
