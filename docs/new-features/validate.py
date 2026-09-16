#!/usr/bin/env python3
"""Validate the ticket corpus, not application behavior or human approval."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "manifest.json").read_text())
tickets = manifest["tickets"]
by_id = {ticket["id"]: ticket for ticket in tickets}
errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


check(len(by_id) == len(tickets) == manifest["ticketCount"], "Duplicate ID or incorrect ticket count")
expected_sources = {f"{prefix}{number:02}" for prefix, count in [("D", 18), ("A", 20), ("P", 30)] for number in range(1, count + 1)}
mapped_sources = {source for ticket in tickets for source in ticket["sources"]}
check(expected_sources <= mapped_sources, f"Missing coverage: {expected_sources - mapped_sources}")
visited, active = set(), set()


def visit(identifier):
    if identifier in active:
        errors.append(f"Dependency cycle at {identifier}")
        return
    if identifier in visited:
        return
    active.add(identifier)
    for dependency in by_id[identifier]["dependsOn"]:
        if dependency in by_id:
            visit(dependency)
        else:
            check(re.fullmatch(r"AUTH-0(?:0[1-9]|1[0-8])", dependency), f"Unknown dependency: {identifier} -> {dependency}")
    active.remove(identifier)
    visited.add(identifier)


for identifier in by_id:
    visit(identifier)

for ticket in tickets:
    path = ROOT / ticket["path"]
    check(path.is_file(), f"Missing ticket: {path}")
    if not path.is_file():
        continue
    content = path.read_text()
    check(content.startswith(f'# {ticket["id"]} '), f"Wrong title ID: {path.name}")
    check(f'**Status:** {ticket["status"]}' in content, f"Wrong status: {path.name}")
    check(path.parent.name == ticket["status"], f"Wrong lifecycle folder: {path.name}")
    for section in range(1, 19):
        check(re.search(rf"^## {section}\. ", content, re.M), f"Missing section {section}: {path.name}")
    scenarios = re.findall(r"^### Test \d+ — .+?$(.*?)(?=^### |^## |\Z)", content, re.M | re.S)
    check(len(scenarios) >= 3, f"Fewer than three scenarios: {path.name}")
    for number, scenario in enumerate(scenarios, 1):
        for field in ["Purpose", "Level", "Setup", "Action", "Expected result", "Required assertions", "Why this test matters", "Likely failure diagnosis"]:
            check(f"**{field}:**" in scenario, f"Missing {field}, test {number}: {path.name}")
    check(content.count("```") % 2 == 0, f"Unbalanced code fence: {path.name}")
    check("STOP — NEEDS ARCHITECT DECISION" in content, f"Missing escalation boundary: {path.name}")
    if ticket["status"] == "Pending":
        check("- [x]" not in content.lower(), f"Precompleted checkbox: {path.name}")

for path in ROOT.rglob("*.md"):
    content = path.read_text()
    for target in re.findall(r"\]\(([^\s]+)\)", content):
        target = target.removeprefix("<").removesuffix(">")
        if target.startswith(("https://", "http://", "#")):
            continue
        destination = target.split("#", 1)[0]
        check((path.parent / destination).exists(), f"Broken local link: {path.relative_to(ROOT)} -> {target}")

check(len(list((ROOT / "Pending").glob("*.md"))) == sum(t["status"] == "Pending" for t in tickets), "Unindexed or missing Pending ticket")
check(len(list((ROOT / "Completed").glob("*.md"))) - 1 == sum(t["status"] == "Completed" for t in tickets), "Unindexed or missing Completed ticket")
if errors:
    print("FAILED")
    print("\n".join(errors))
    raise SystemExit(1)
print(f"PASS: {len(tickets)} tickets; {len(expected_sources)} assessment items; dependencies acyclic; sections, scenarios, statuses and local links valid.")
print("Documentation validation only. No runtime, hosted CI, deployment or approval claim.")
