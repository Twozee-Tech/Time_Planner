# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **resource/capacity planning web application** (codename: "Planowanie") for Amplitiv. It replaces a manual Excel spreadsheet used to track team member workload and project assignments across weeks. The project is currently in the **requirements phase** — no code has been written yet.

Requirements are defined in `plan.md` (in Polish). A reference screenshot of the existing Excel-based system is in `system.png`.

## Requirements Summary

### Core Features

1. **Main Dashboard** — Weekly calendar view (like the Excel reference) showing all team members and upcoming weeks. Weekends and Polish holidays are automatically grayed out.

2. **Individual Calendar** — Clicking a person's name opens a large calendar. Users can click a single day or drag-select a range of days.

3. **Project Assignment** — After selecting days, a right-side panel shows a project list with checkboxes. One checkbox marks the "primary" project. Each assignment period gets a workload color:
   - **Red** — Overloaded
   - **Yellow** — Full capacity (100%)
   - **Green** — Has availability for more work

4. **Left Navigation Sidebar**:
   - Main dashboard link
   - **Projects** — Add/deactivate projects. Fields: Project Name, Project ID, Label
   - **People** — Add/remove team members. Each person has an assigned SDM (Scrum Development Manager, also a person in the system)

5. **Authentication** — Login system with user accounts

### Technical Requirements

- Dockerized web application
- Modern, professional UI styled after [amplitiv.com](https://amplitiv.com) with Amplitiv branding
