package com.google.javascript.jscomp;

import com.google.javascript.rhino.Node;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.InvalidParameterException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ClosureMediator {
    private final static int OUTPUT_TYPE_IDX = 0;
    private final static int GRAPH_TYPE_IDX = 1;
    private final static int OUT_FILE_NAME_IDX = 2;
    private final static int JS_FILE_NAMES_START_IDX = 3;
    private final static String[] DEFAULT_EXTERN_FILENAMES = {};

    private enum GraphType {
        AST,
        CFG
    };

    private enum OutputType {
        DOT,
        JSON
    };

    private static String generateDotFromJS(String[] fileNames, GraphType graphType) throws IOException {
        Compiler compiler = getCompilerFromJSFileNames(fileNames);

        Node root = compiler.getRoot();
        ControlFlowAnalysis cfa = new ControlFlowAnalysis(compiler, true, true);
        cfa.process(null, root);
        ControlFlowGraph<Node> cfg = cfa.getCfg();
        switch (graphType) {
            case AST:
                return DotFormatter.toDot(root);
            case CFG:
                return DotFormatter.toDot(root, cfg);
            default:
                throw new InvalidParameterException();
        }
    }

    private static String generateJsonFromJS(String[] fileNames) throws Exception {
        Compiler compiler = getCompilerFromJSFileNames(fileNames);
        Node root = compiler.getRoot();
        ControlFlowAnalysis cfa = new ControlFlowAnalysis(compiler, true, true);
        cfa.process(null, root);
        ControlFlowGraph<Node> cfg = cfa.getCfg();
        return JSONFormatter.toJSON(root, cfg);
    }

    private static Compiler getCompilerFromJSFileNames(String[] fileNames) {
        return getCompilerFromJSFileNames(fileNames, DEFAULT_EXTERN_FILENAMES);
    }

    private static Compiler getCompilerFromJSFileNames(String[] fileNames, String[] externFileNames) {
        Compiler compiler = new Compiler();
        compiler.setLifeCycleStage(AbstractCompiler.LifeCycleStage.NORMALIZED);
        CompilerOptions options = new CompilerOptions();
        options.anonymousFunctionNaming = AnonymousFunctionNamingPolicy.MAPPED;
        options.recordFunctionInformation = true;
        options.checksOnly = true;
        options.computeFunctionSideEffects = true;
        options.checkTypes = true;
        options.setLanguage(CompilerOptions.LanguageMode.ECMASCRIPT_2018);
        options.setExtractPrototypeMemberDeclarations(true);

        List<SourceFile> externs = new ArrayList<>();
        List<SourceFile> inputs = new ArrayList<>();

        for (String externFileName : externFileNames) {
            externs.add(SourceFile.fromFile(externFileName));
        }

        for (String fileName : fileNames) {
            inputs.add(SourceFile.fromFile(fileName));
        }

        compiler.init(externs, inputs, options);
        compiler.parse();
        return compiler;
    }

    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Usage: CloseMediator [DOT|JSON] [CFG|AST] outputFileName.dot filename1.js[ filename2.js filename3.js etc]");
            return;
        }
        try {
            String outputTypeStr = args[OUTPUT_TYPE_IDX];
            String graphTypeStr = args[GRAPH_TYPE_IDX];
            String outFileName = args[OUT_FILE_NAME_IDX];
            String[] jsFilesList = Arrays.copyOfRange(args, JS_FILE_NAMES_START_IDX, args.length);

            GraphType graphType = GraphType.valueOf(graphTypeStr);
            OutputType outputType = OutputType.valueOf(outputTypeStr);

            String outStr = "";
            if ((OutputType.JSON == outputType) && (GraphType.AST == graphType)) {
                System.out.println("This option is not yet supported");
                return;
            }
            switch (outputType) {
                case DOT:
                    outStr = generateDotFromJS(jsFilesList, graphType);
                    break;
                case JSON:
                    outStr = generateJsonFromJS(jsFilesList);
                    break;
            }
            Files.write(Paths.get(outFileName), outStr.getBytes());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}