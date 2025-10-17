import argparse
import time
import os
import requests
from dotenv import load_dotenv, find_dotenv


def check_for_codex_post(owner, repo, pr_number, headers):
    """
    Look for a Codex connector summary comment on the PR.
    """
    comments_url = f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments"
    try:
        response = requests.get(comments_url, headers=headers)
        response.raise_for_status()
        for comment in response.json():
            user = comment.get("user", {}).get("login")
            if user == "chatgpt-codex-connector[bot]":
                body = comment.get("body", "")
                if "Summary" in body and "Testing" in body:
                    print(f"Found Codex post on PR #{pr_number}!")
                    return True
    except requests.exceptions.RequestException as exc:
        print(f"Error retrieving PR comments: {exc}")
    return False


def check_for_codex_commits(owner, repo, pr_number, headers):
    """
    Look for commits authored by the Codex connector on the PR branch.
    """
    pr_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    try:
        response = requests.get(pr_url, headers=headers)
        response.raise_for_status()
        head_branch = response.json().get("head", {}).get("ref")
        if not head_branch:
            print(f"Could not determine head branch for PR #{pr_number}.")
            return False

        commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?sha={head_branch}"
        response = requests.get(commits_url, headers=headers)
        response.raise_for_status()
        for commit in response.json():
            author = commit.get("author")
            if author and author.get("login") == "chatgpt-codex-connector[bot]":
                print(f"Found Codex commit on branch for PR #{pr_number}!")
                return True
    except requests.exceptions.RequestException as exc:
        print(f"Error retrieving PR commits: {exc}")
    return False


def load_env():
    """
    Load environment variables from .env files if present.
    """
    base_env = find_dotenv(usecwd=True)
    if base_env:
        load_dotenv(base_env, override=False)

    local_env = find_dotenv(".env.local", usecwd=True)
    if local_env:
        load_dotenv(local_env, override=False)


def wait_for_pr_update(owner, repo, pr_number, timeout, refresh_interval):
    """
    Monitor a PR for Codex activity or general updates.
    """
    load_env()

    print(f"Monitoring PR #{pr_number} for updates in {owner}/{repo}...")
    start_time = time.time()

    github_token = os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_PAT")
    if not github_token:
        print("Neither GITHUB_TOKEN nor GITHUB_PAT is set. Exiting.")
        return False

    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    pr_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    try:
        response = requests.get(pr_url, headers=headers)
        response.raise_for_status()
        pr_data = response.json()
        last_updated_at = pr_data.get("updated_at")
        print(f"Initial PR updated_at: {last_updated_at}")
    except requests.exceptions.RequestException as exc:
        print(f"Error retrieving initial PR details: {exc}. Exiting.")
        return False

    if check_for_codex_post(owner, repo, pr_number, headers):
        return True
    if check_for_codex_commits(owner, repo, pr_number, headers):
        return True

    while (time.time() - start_time) < timeout:
        time.sleep(refresh_interval)
        elapsed = int(time.time() - start_time)
        print(f"Checking for updates... (Elapsed: {elapsed}s / {timeout}s)")

        try:
            response = requests.get(pr_url, headers=headers)
            response.raise_for_status()
            current_updated_at = response.json().get("updated_at")
            if current_updated_at != last_updated_at:
                print(f"PR #{pr_number} has been updated!")
                print(f"Old updated_at: {last_updated_at}")
                print(f"New updated_at: {current_updated_at}")
                return True
        except requests.exceptions.RequestException as exc:
            print(f"Error retrieving PR details: {exc}. Continuing to wait.")

        if check_for_codex_post(owner, repo, pr_number, headers):
            return True
        if check_for_codex_commits(owner, repo, pr_number, headers):
            return True

    print(
        f"Timeout reached. PR #{pr_number} was not updated or did not receive a Codex post within {timeout} seconds."
    )
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Wait for a GitHub Pull Request to be updated or for a Codex post."
    )
    parser.add_argument("--pr_number", type=int, required=True, help="Pull request number.")
    parser.add_argument(
        "--timeout", type=int, default=300, help="Maximum time to wait in seconds (default 300)."
    )
    parser.add_argument(
        "--refresh_interval",
        type=int,
        default=10,
        help="Interval between checks in seconds (default 10).",
    )
    parser.add_argument(
        "--owner", type=str, default="dangerusslee", help="Repository owner (default dangerusslee)."
    )
    parser.add_argument(
        "--repo",
        type=str,
        default="chrome-devtools-stealth-mcp",
        help="Repository name (default chrome-devtools-stealth-mcp).",
    )

    args = parser.parse_args()
    success = wait_for_pr_update(
        args.owner, args.repo, args.pr_number, args.timeout, args.refresh_interval
    )
    if success:
        print("PR update detected.")
    else:
        print("No update detected within timeout.")
