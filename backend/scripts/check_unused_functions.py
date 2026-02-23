#!/usr/bin/env python3
"""
Check for unused functions, classes, and constants in the project.

This script scans all Python files in the FastAPI app,
identifies function/class/constant definitions, and reports any
that are not referenced elsewhere in the codebase.

Usage:
    python scripts/check_unused_functions.py
    # or
    make unused
"""
# ruff: noqa: T201

import ast
import sys
from collections import defaultdict
from pathlib import Path

# Directories to scan
APP_DIRS = ["app"]

# Functions that are expected to be unused (entry points, callbacks, etc.)
IGNORED_FUNCTIONS = {
    # FastAPI lifespan
    "lifespan",
    "create_app",
    # Pydantic validators (field_validator, model_validator)
    "validate_",
    # Magic methods
    "__init__",
    "__str__",
    "__repr__",
    "__call__",
    "__enter__",
    "__exit__",
    "__aenter__",
    "__aexit__",
    "__hash__",
    "__eq__",
    "__lt__",
    "__le__",
    "__gt__",
    "__ge__",
    # Test functions
    "test_",
    # Common serialization methods
    "to_dict",
    "to_json",
    # Pydantic settings methods
    "get_cors_origins",
}

# Classes that are expected to be unused
IGNORED_CLASSES = {
    # Pydantic config classes
    "Config",
    "ConfigDict",
    # Exception classes (raised, not called)
    "Error",
    "Exception",
    # Test classes
    "Test",
    # SQLAlchemy base
    "Meta",
    # Mixins
    "Mixin",
}

# Variables/constants that are expected to be unused or used dynamically
IGNORED_VARIABLES = {
    # Module-level app instances
    "app",
    "router",
    # Alembic
    "target_metadata",
    # Pydantic model config
    "model_config",
}

# Decorators that indicate the function is used externally
EXTERNAL_USE_DECORATORS = {
    # FastAPI route decorators
    "get",
    "post",
    "put",
    "delete",
    "patch",
    "options",
    "head",
    # FastAPI event handlers
    "on_event",
    "exception_handler",
    # Context managers
    "contextmanager",
    "asynccontextmanager",
    # Standard decorators
    "property",
    "staticmethod",
    "classmethod",
    # Pydantic validators
    "field_validator",
    "model_validator",
    "validator",
    "root_validator",
    # Pytest fixtures
    "fixture",
    "pytest.fixture",
    # lru_cache
    "lru_cache",
    "cache",
}

# Directories to skip
SKIP_DIRS = {"__pycache__", ".venv", "venv", ".git", "node_modules", "alembic"}

SKIP_FILES_FOR_DEFINITIONS = {"models.py"}


def get_python_files(
    root_dir: Path, apps: list[str], skip_files: set[str] | None = None
) -> list[Path]:
    """Get all Python files in the app directories, excluding test files."""
    if skip_files is None:
        skip_files = set()

    python_files = []
    for app in apps:
        app_dir = root_dir / app
        if not app_dir.exists():
            continue
        for path in app_dir.rglob("*.py"):
            if any(skip_dir in path.parts for skip_dir in SKIP_DIRS):
                continue
            if path.name in skip_files:
                continue
            if path.name.startswith("test_") or path.name.endswith("_test.py"):
                continue
            python_files.append(path)
    return python_files


def has_external_use_decorator(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    """Check if function has a decorator indicating external use."""
    for decorator in node.decorator_list:
        if isinstance(decorator, ast.Call):
            if isinstance(decorator.func, ast.Attribute):
                if decorator.func.attr in EXTERNAL_USE_DECORATORS:
                    return True
            elif isinstance(decorator.func, ast.Name):
                if decorator.func.id in EXTERNAL_USE_DECORATORS:
                    return True
        elif isinstance(decorator, ast.Attribute):
            if decorator.attr in EXTERNAL_USE_DECORATORS:
                return True
        elif isinstance(decorator, ast.Name):
            if decorator.id in EXTERNAL_USE_DECORATORS:
                return True
    return False


def extract_function_definitions(file_path: Path) -> dict[str, int]:
    """Extract all function definitions from a Python file."""
    functions = {}
    try:
        with open(file_path, encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                if node.name.startswith("_"):
                    continue
                if any(
                    node.name == ignored or node.name.startswith(ignored)
                    for ignored in IGNORED_FUNCTIONS
                ):
                    continue
                if has_external_use_decorator(node):
                    continue
                functions[node.name] = node.lineno
    except SyntaxError:
        pass

    return functions


def has_external_use_class_decorator(node: ast.ClassDef) -> bool:
    """Check if class has a decorator indicating external use."""
    for decorator in node.decorator_list:
        if isinstance(decorator, ast.Call):
            if isinstance(decorator.func, ast.Name):
                if decorator.func.id in {"dataclass", "total_ordering"}:
                    return True
        elif isinstance(decorator, ast.Name):
            if decorator.id in {"dataclass", "total_ordering"}:
                return True
    return False


def extract_class_definitions(file_path: Path) -> dict[str, int]:
    """Extract all class definitions from a Python file."""
    classes = {}
    try:
        with open(file_path, encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                if node.name.startswith("_"):
                    continue
                if any(
                    node.name == ignored or node.name.endswith(ignored)
                    for ignored in IGNORED_CLASSES
                ):
                    continue
                if has_external_use_class_decorator(node):
                    continue
                classes[node.name] = node.lineno
    except SyntaxError:
        pass

    return classes


def extract_variable_definitions(file_path: Path) -> dict[str, int]:
    """Extract module-level constant/variable definitions from a Python file."""
    variables = {}
    try:
        with open(file_path, encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))

        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        name = target.id
                        if name.isupper() or ("_" in name and name.replace("_", "").isupper()):
                            if name.startswith("_"):
                                continue
                            if name in IGNORED_VARIABLES:
                                continue
                            variables[name] = node.lineno

            elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
                name = node.target.id
                if name.isupper() or ("_" in name and name.replace("_", "").isupper()):
                    if name.startswith("_"):
                        continue
                    if name in IGNORED_VARIABLES:
                        continue
                    variables[name] = node.lineno

    except SyntaxError:
        pass

    return variables


def extract_references(file_path: Path) -> set[str]:
    """Extract all name references from a Python file."""
    references = set()
    try:
        with open(file_path, encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    references.add(node.func.id)
                elif isinstance(node.func, ast.Attribute):
                    references.add(node.func.attr)
            elif isinstance(node, ast.Name):
                references.add(node.id)
            elif isinstance(node, ast.Attribute):
                references.add(node.attr)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    references.add(name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    references.add(name)
            elif isinstance(node, ast.Constant) and isinstance(node.value, str):
                value = node.value
                if "." in value:
                    last_part = value.rsplit(".", 1)[-1]
                    if last_part.isidentifier():
                        references.add(last_part)
                elif value.isidentifier():
                    references.add(value)

    except SyntaxError:
        pass

    return references


def find_unused_symbols(
    root_dir: Path, apps: list[str]
) -> tuple[
    dict[Path, list[tuple[str, int]]],
    dict[Path, list[tuple[str, int]]],
    dict[Path, list[tuple[str, int]]],
]:
    """Find all unused functions, classes, and constants in the project."""
    definition_files = get_python_files(root_dir, apps, skip_files=SKIP_FILES_FOR_DEFINITIONS)
    all_files = get_python_files(root_dir, apps, skip_files=None)

    all_func_definitions: dict[Path, dict[str, int]] = {}
    all_class_definitions: dict[Path, dict[str, int]] = {}
    all_var_definitions: dict[Path, dict[str, int]] = {}

    for file_path in definition_files:
        func_defs = extract_function_definitions(file_path)
        if func_defs:
            all_func_definitions[file_path] = func_defs

        class_defs = extract_class_definitions(file_path)
        if class_defs:
            all_class_definitions[file_path] = class_defs

        var_defs = extract_variable_definitions(file_path)
        if var_defs:
            all_var_definitions[file_path] = var_defs

    all_references: set[str] = set()
    for file_path in all_files:
        references = extract_references(file_path)
        all_references.update(references)

    unused_funcs: dict[Path, list[tuple[str, int]]] = defaultdict(list)
    for file_path, definitions in all_func_definitions.items():
        for name, line_no in definitions.items():
            if name not in all_references:
                unused_funcs[file_path].append((name, line_no))

    unused_classes: dict[Path, list[tuple[str, int]]] = defaultdict(list)
    for file_path, definitions in all_class_definitions.items():
        for name, line_no in definitions.items():
            if name not in all_references:
                unused_classes[file_path].append((name, line_no))

    unused_vars: dict[Path, list[tuple[str, int]]] = defaultdict(list)
    for file_path, definitions in all_var_definitions.items():
        for name, line_no in definitions.items():
            if name not in all_references:
                unused_vars[file_path].append((name, line_no))

    return dict(unused_funcs), dict(unused_classes), dict(unused_vars)


def print_unused_items(
    items: dict[Path, list[tuple[str, int]]],
    project_root: Path,
    symbol_type: str,
    suffix: str,
) -> int:
    """Print unused items and return count."""
    count = 0
    for file_path, symbols in sorted(items.items()):
        rel_path = file_path.relative_to(project_root)
        for name, line_no in sorted(symbols, key=lambda x: x[1]):
            print(f"  {rel_path}:{line_no} - {name}{suffix}")
            count += 1
    return count


def main() -> None:
    """Main entry point."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    existing_apps = [app for app in APP_DIRS if (project_root / app).exists()]
    if not existing_apps:
        print(f"Error: No app directories found at {project_root}", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning for unused symbols in: {project_root}")
    print(f"Directories: {', '.join(existing_apps)}\n")

    unused_funcs, unused_classes, unused_vars = find_unused_symbols(project_root, existing_apps)

    total_unused = 0

    if unused_funcs:
        print("=" * 60)
        print("UNUSED FUNCTIONS")
        print("=" * 60)
        total_unused += print_unused_items(unused_funcs, project_root, "function", "()")
        print()

    if unused_classes:
        print("=" * 60)
        print("UNUSED CLASSES")
        print("=" * 60)
        total_unused += print_unused_items(unused_classes, project_root, "class", "")
        print()

    if unused_vars:
        print("=" * 60)
        print("UNUSED CONSTANTS")
        print("=" * 60)
        total_unused += print_unused_items(unused_vars, project_root, "constant", "")
        print()

    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    func_count = sum(len(items) for items in unused_funcs.values())
    class_count = sum(len(items) for items in unused_classes.values())
    var_count = sum(len(items) for items in unused_vars.values())
    print(f"  Unused functions: {func_count}")
    print(f"  Unused classes:   {class_count}")
    print(f"  Unused constants: {var_count}")
    print(f"  Total:            {total_unused}")

    if total_unused == 0:
        print("\nNo unused symbols found!")

    sys.exit(1 if total_unused > 0 else 0)


if __name__ == "__main__":
    main()
