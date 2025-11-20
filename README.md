# skillswap

## Project Structure

Two folders exist at the root: `frontend` and `backend`. The `frontend` folder contains the Astro project, while the
`backend` folder contains the actual server. The Astro project is a static site that is built and then served by the
backend.

## Running the Project

Docker Compose is used to run both the frontend and backend together. To start the project, run the following command
from the root directory:
```sh
docker compose up
```

You can alternatively run development servers that update live as you make changes by using the `dev` profile:
```sh
docker compose --profile dev up
```

## Frontend

The frontend is built using Astro using the Bun runtime. For more information, see the `frontend/README.md` file.

## Backend

The backend is a simple Node.JS server using the Bun runtime. For more information, see the `backend/README.md` file.
