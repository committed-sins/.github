# .github

The public organization profile lives in `profile/README.md`.

## Generate the profile tables

Run **Generate organization profile** from the Actions tab. The workflow also runs weekly and on pull requests that modify the profile, generator, or workflow. The `generated-profile` artifact contains the proposed README and a diff. Review both before applying the changes in a signed commit.

The generator uses descriptions from public GitHub repositories. It preserves the profile's prose, existing display names, statuses, and row order. Add one of `profile-obsidian`, `profile-minecraft`, `profile-sites`, or `profile-file-tools` as a repository topic to select a category. Without a category topic, existing entries stay in their current section. New entries start with `In development`; adjust their status in the profile when you apply the update.
