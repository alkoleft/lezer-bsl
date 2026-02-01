import { styleTags, tags as t } from "@lezer/highlight"

export const bslHighlighting = styleTags({
    // Literals
    Number: t.number,
    String: t.string,
    MultilineString: t.string,
    MultilineStringStart: t.string,
    MultilineStringContinue: t.string,
    Date: t.literal,
    "true false": t.bool,
    "undefined null": t.null,
    
    // Comments and preprocessor
    Preproc: t.processingInstruction,
    Comment: t.lineComment,
    
    // Identifiers and variables
    VariableName: t.variableName,
    Name: t.variableName,
    
    // definitions
    "var procedure function": t.definitionKeyword,
    "endProcedure endFunction": t.keyword,
    VarSpec: t.variableName,
    
    // Control flow statements
    ["if then elseIf else endIf while do endDo for each in to " +
    "try except endTry continue break goto return raise"]: t.controlKeyword,
    
    "LogicOp and or not": t.operator,
    ArithOp: t.arithmeticOperator,
    CompareOp: t.compareOperator,
    AssignOp: t.definitionOperator,
    
    // Expressions
    "new": t.keyword,
    "TypeName TypeName/String": t.className,
    MemberExpr: t.propertyName,
    BinaryExpr: t.operator,
    UnaryExpr: t.operator,
    TernaryExpr: t.operator,
    AssignmentStmt: t.operator,
    
    // Modifiers and annotations
    "export async val": t.modifier,
    Annotation: t.annotation,
    AnnotationType: t.typeName,
    
    // Event handlers
    AddHandlerStmt: t.keyword,
    RemoveHandlerStmt: t.keyword,
    
    // Execution
    ExecuteStmt: t.keyword,
    AwaitExpr: t.keyword,
    
    // Labels
    LabelStmt: t.labelName
})