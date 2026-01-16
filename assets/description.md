# SkillSwap

SkillSwap is a learning platform designed to connect students who want to share their knowledge and learn new skills. It
brings together a collaborative community of learners and educators to facilitate skill exchange through interactive
sessions. The platform allows users to host and attend sessions, track their learning progress, and build a reputation
based on their contributions to the community.

## Purpose

The primary goal of SkillSwap is to democratize learning within a community. It provides a flexible environment for:
*   **Knowledge Exchange:** Enabling users to host and attend tutoring sessions.
*   **Skill Development:** Helping users track their growth and progress through ratings and session history.
*   **Mentor Discovery:** Allowing users to find mentors based on their skills and reputation within the community.

## How It Works

### 1. User Profiles & Identity

Users create an account to establish their digital presence. A profile includes:
*   **Bio & Avatar:** Personal information used to introduce themselves.
*   **Skills & Tags:** A list of competencies they can teach or want to learn.
*   **Reputation System:** Visible stats including average rating, number of sessions hosted, and students taught.

### 2. Hosting & Attending Sessions

The core interaction on SkillSwap resolves around **Sessions**:
*   **Create a Session:** Mentors allow users to schedule sessions, specifying the topic, difficulty level,
                          prerequisites, and meeting details (including virtual meeting URLs).
*   **Registration:** Students can browse available sessions and register to attend.
*   **Management:** The system tracks registrations and coordinates the event.

### 3. Feedback & Growth

To ensure quality and trust:
*   **Reviews:** After a session, participants can leave reviews and ratings.
*   **Gamification:** Users earn recognition for their contributions.
-   **Moderation:** The platform includes tools for managing content on the platform.

## Technical Overview

*   **Frontend:** Built with **Astro** (SSR) and **Svelte** (SSR+CSR), ensuring a fast, interactive, and modern user
                 interface.
*   **Backend:** Powered by a robust **Bun** (Node.JS) environment using **Prisma** ORM for type-safe database
                 interactions.
*   **Database:** Currently configured with **SQLite** for ease of development and portability. Dev server configured
                  to use **PostgreSQL**. Prisma makes it plug-and-play for database migrations.
*   **Infrastructure:** Containerized with **Docker** for consistent deployment across development and production
                        environments.
