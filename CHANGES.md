# Solution Changelog — Cloned Repo vs Fixed Repo

This document tracks **every difference** between the original [adbrew/adb_test](https://github.com/adbrew/adb_test) clone and this working solution.

**Maintain this file:** whenever you change a file that existed in the clone, add a dated entry here with before/after code and the reason.

---

## Summary

| Status | File | Why changed |
|--------|------|-------------|
| Modified | `Dockerfile` | Fix M1/modern Debian build failures; install real Yarn + Node (not cmdtest) |
| Modified | `docker-compose.yml` | Use official Mongo 6.0; stable app/api builds on M1; bind React dev server to `0.0.0.0` |
| Modified | `src/rest/rest/views.py` | Implement GET/POST todos (README task) |
| Modified | `src/app/src/App.js` | React hooks + API integration (README task) |
| Added | `.cursor/rules/*.mdc` | Assignment-specific Cursor AI rules |
| Added | `AGENTS.md` | Project-wide AI instructions |
| Added | `CHANGES.md` | This changelog |

**Unchanged from clone:** `README.md`, `src/requirements.txt`, `src/rest/rest/urls.py`, `src/rest/rest/settings.py`, and all other scaffold files.

**Last updated:** 2026-07-01

---

## 1. Backend — `src/rest/rest/views.py`

**README requirement:** Persist and retrieve todos from Mongo using the existing `db` instance. No Django models, serializers, or SQLite.

### Before (cloned repo)

```python
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import json, logging, os
from pymongo import MongoClient

mongo_uri = 'mongodb://' + os.environ["MONGO_HOST"] + ':' + os.environ["MONGO_PORT"]
db = MongoClient(mongo_uri)['test_db']

class TodoListView(APIView):

    def get(self, request):
        # Implement this method - return all todo items from db instance above.
        return Response({}, status=status.HTTP_200_OK)

    def post(self, request):
        # Implement this method - accept a todo item in a mongo collection, persist it using db instance above.
        return Response({}, status=status.HTTP_200_OK)
```

### After (solution)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import os
from pymongo import MongoClient

mongo_uri = 'mongodb://' + os.environ["MONGO_HOST"] + ':' + os.environ["MONGO_PORT"]
db = MongoClient(mongo_uri)['test_db']

TODOS_COLLECTION = 'todos'


def serialize_todo(document):
    return {
        'id': str(document['_id']),
        'description': document['description'],
    }


class TodoListView(APIView):

    def get(self, request):
        todos = db[TODOS_COLLECTION].find()
        return Response(
            [serialize_todo(todo) for todo in todos],
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        description = request.data.get('description', '').strip()

        if not description:
            return Response(
                {'error': 'Description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = db[TODOS_COLLECTION].insert_one({'description': description})
        created_todo = db[TODOS_COLLECTION].find_one({'_id': result.inserted_id})

        return Response(
            serialize_todo(created_todo),
            status=status.HTTP_201_CREATED,
        )
```

### What changed and why

| Change | Reason |
|--------|--------|
| Removed unused imports (`render`, `json`, `logging`) | Dead code; keeps view focused |
| Added `TODOS_COLLECTION = 'todos'` | Named constant instead of magic string |
| Added `serialize_todo()` | Converts Mongo `_id` (ObjectId) to JSON-safe string `id` |
| `get()` returns list of todos | README: `GET /todos` must return backend data |
| `post()` validates + inserts into Mongo | README: form submit creates todo in MongoDB |
| Returns `400` for empty description | Input validation; production-quality error handling |
| Returns `201` on create | REST convention for successful resource creation |

---

## 2. Frontend — `src/app/src/App.js`

**README requirement:** React hooks only. Fetch todos from backend. POST on submit. Refresh list after create. No hardcoded data.

### Before (cloned repo)

```javascript
import './App.css';
import logo from './logo.svg';


export function App() {
  return (
    <div className="App">
      <div>
        <h1>List of TODOs</h1>
        <li>Learn Docker</li>
        <li>Learn React</li>
      </div>
      <div>
        <h1>Create a ToDo</h1>
        <form>
          <div>
            <label for="todo">ToDo: </label>
            <input type="text" />
          </div>
          <div style={{"marginTop": "5px"}}>
            <button>Add ToDo!</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
```

### After (solution)

```javascript
import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000/todos/';

async function fetchTodos() { /* ... */ }
async function createTodo(description) { /* ... */ }

export function App() {
  const [todos, setTodos] = useState([]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadTodos(); }, []);

  const handleSubmit = async (event) => { /* POST + refresh list */ };

  return ( /* dynamic list + controlled form */ );
}
```

*(Full current file: 117 lines — see `src/app/src/App.js`.)*

### What changed and why

| Change | Reason |
|--------|--------|
| Added `useState`, `useEffect` | README mandates React hooks |
| Removed hardcoded `<li>` items | README: list must come from `GET /todos` |
| Added `fetchTodos` / `createTodo` | Calls `http://localhost:8000/todos/` per README |
| Controlled input (`value` + `onChange`) | Standard React form pattern |
| `useEffect` loads todos on mount | README: show backend todos on page load |
| Re-fetch after successful POST | README: refresh list after form submit |
| Loading, error, empty states | Production-quality UX without extra libraries |
| `htmlFor` instead of `for` | Correct JSX attribute for labels |
| Removed unused `logo` import | Dead code |

---

## 3. Docker — `docker-compose.yml`

**README requirement:** Do not bypass Docker. Preserve 3-service architecture.

### Before (cloned repo)

```yaml
  api:
    build: .
    container_name: api
    # ...

  app:
    build: .
    container_name: app
    # ...

  mongo:
    build: .
    container_name: mongo
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - ${ADBREW_CODEBASE_PATH}/db/:/data/db
    command: /usr/bin/mongod --bind_ip 0.0.0.0
```

### After (solution)

```yaml
  api:
    build: .
    platform: linux/amd64
    container_name: api
    # ... (unchanged: command, ports, volumes, links)

  app:
    build: .
    platform: linux/amd64
    container_name: app
    command: bash -c "cd /src/app && yarn install && HOST=0.0.0.0 yarn start"
    # ... (ports, volumes unchanged)

  mongo:
    image: mongo:6.0
    container_name: mongo
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - ${ADBREW_CODEBASE_PATH}/db/:/data/db
```

### What changed and why

| Change | Reason |
|--------|--------|
| `mongo`: `build: .` → `image: mongo:6.0` | Original Dockerfile installed MongoDB 4.4 via apt — fails on Mac M1 (missing `libssl1.1`, no ARM packages). Official image is multi-arch and maintained |
| Removed `command: /usr/bin/mongod --bind_ip 0.0.0.0` | Official `mongo:6.0` image handles bind config by default |
| Added `platform: linux/amd64` on `app` and `api` | `requirements.txt` includes packages (e.g. pandas 1.1.2) that fail to compile on ARM64; amd64 uses prebuilt wheels |
| App command: `HOST=0.0.0.0 yarn start` | Create React App binds to `localhost` by default; must bind `0.0.0.0` for Docker port mapping to work |
| Kept service name `mongo`, port `27017`, volumes | README + Cursor rules: do not change networking or hostnames (`MONGO_HOST=mongo` still works) |

---

## 4. Docker — `Dockerfile`

**README requirement:** Solution must run inside existing containers. Minimal changes only when necessary.

### Before (cloned repo)

```dockerfile
FROM python:3.8

# ... apt packages, yarn ...

# Mongo
RUN ln -s /bin/echo /bin/systemctl
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
RUN echo "deb http://repo.mongodb.org/apt/debian buster/mongodb-org/4.4 main" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
RUN apt-get -y update
RUN apt-get install -y mongodb-org

RUN apt-get install -y yarn

# Install PIP
RUN easy_install pip

ENV ENV_TYPE staging
# ...
RUN pip install -r requirements.txt
```

### After (solution)

```dockerfile
FROM python:3.8-bullseye

# ... apt packages ...

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

# Install Node.js and Yarn (update required after adding yarn repo)
RUN apt-get update && apt-get install -y nodejs yarn

ENV ENV_TYPE staging
# ...
RUN pip install -r requirements.txt
```

### What changed and why

| Change | Reason |
|--------|--------|
| `python:3.8` → `python:3.8-bullseye` | Pins Debian version for more predictable pip/apt compatibility |
| Removed MongoDB 4.4 apt install block | Mongo now runs from official `mongo:6.0` image; `app`/`api` never needed Mongo installed |
| Removed `RUN easy_install pip` | Deprecated and fails on modern images; `python:3.8` already includes pip |
| `apt-get update && apt-get install -y nodejs yarn` | Without `apt-get update` after adding the Yarn repo, Debian installs `cmdtest` (fake `yarn` binary) instead of JS Yarn; caused app crash: `ERROR: [Errno 2] No such file or directory: 'install'` |

---

## 5. New files — Cursor rules (not in cloned repo)

These were added to guide AI-assisted development for the assignment. They do **not** affect runtime.

| File | Purpose |
|------|---------|
| `.cursor/rules/00-assignment.mdc` | Priorities: correctness, quality, maintainability |
| `.cursor/rules/architecture.mdc` | 3-service boundaries; notes `api` service → `src/rest/` code |
| `.cursor/rules/react.mdc` | Hooks-only rules for `src/app/**/*.js` |
| `.cursor/rules/backend.mdc` | Mongo-only API rules for `src/rest/**/*.py` |
| `.cursor/rules/docker.mdc` | Preserve Docker setup |
| `.cursor/rules/code-quality.mdc` | Production-quality standards |
| `.cursor/rules/api.mdc` | REST/JSON conventions |
| `.cursor/rules/mongo.mdc` | Mongo persistence constraints |
| `.cursor/rules/interview.mdc` | Explainable code for walkthrough |
| `.cursor/rules/ai-assistant.mdc` | AI behaviour when editing codebase |
| `AGENTS.md` | Project-wide instructions for Cursor |

**Note on `backend.mdc` glob:** template used `src/api/**/*.py`; corrected to `src/rest/**/*.py` because Django code lives under `src/rest/` (Docker service is still named `api`).

---

## 6. API contract (introduced by solution)

Not explicitly defined in the clone. This is what the frontend and backend now use:

### `GET /todos/`

**Response `200`:**
```json
[
  { "id": "665f1a2b3c4d5e6f7a8b9c0d", "description": "Learn Docker" }
]
```

### `POST /todos/`

**Request body:**
```json
{ "description": "My new todo" }
```

**Response `201`:**
```json
{ "id": "665f1a2b3c4d5e6f7a8b9c0d", "description": "My new todo" }
```

**Response `400` (empty description):**
```json
{ "error": "Description is required." }
```

### Mongo document shape

```json
{ "_id": ObjectId("..."), "description": "My new todo" }
```

Collection: `todos` in database `test_db`.

---

## 7. Known environment issues (not code bugs)

| Issue | Cause | Workaround |
|-------|-------|------------|
| `mongodb-org` install fails | Original clone Dockerfile; fixed by `mongo:6.0` image | Applied hint #3 above |
| `pandas` compile fails on ARM64 | Old `requirements.txt` pins pandas 1.1.2 without ARM wheels | `platform: linux/amd64` on app/api |
| App exits with `No such file or directory: 'install'` | Debian `cmdtest` package provides a fake `yarn` binary when Yarn repo is not refreshed via `apt-get update` | `apt-get update && apt-get install -y nodejs yarn` in Dockerfile (see section 4) |
| React app unreachable on `localhost:3000` | CRA dev server binds to `127.0.0.1` inside container by default | `HOST=0.0.0.0 yarn start` in app service command (see section 3) |
| Docker `input/output error` on `compose up` | Local Docker Desktop storage corruption | Restart Docker Desktop; `docker system prune -a` |

---

## 8. Future changes

Add new entries below as work continues. Use this template:

```markdown
### YYYY-MM-DD — `path/to/file`

**Before:** ...
**After:** ...
**Reason:** ...
```

### 2026-07-01 — `Dockerfile`

**Before:**
```dockerfile
# Install Yarn
RUN apt-get install -y yarn
```

**After:**
```dockerfile
# Install Node.js and Yarn (update required after adding yarn repo)
RUN apt-get update && apt-get install -y nodejs yarn
```

**Reason:** After adding the Yarn apt repo, `apt-get update` is required before install. Without it, Debian installs the `cmdtest` package's fake `yarn` binary (v0.32+git) instead of the JavaScript Yarn package manager (v1.22+). The app container then crashes on startup with `ERROR: [Errno 2] No such file or directory: 'install'` when running `yarn install`.

---

### 2026-07-01 — `docker-compose.yml` (app service)

**Before:**
```yaml
command: bash -c "cd /src/app && yarn install && yarn start"
```

**After:**
```yaml
command: bash -c "cd /src/app && yarn install && HOST=0.0.0.0 yarn start"
```

**Reason:** Create React App's dev server binds to `localhost` by default inside the container. Docker port mapping (`3000:3000`) requires the server to listen on `0.0.0.0`. Setting `HOST=0.0.0.0` makes http://localhost:3000 reachable from the host.

---

## Quick diff command

To regenerate a machine diff against the original clone at any time:

```bash
cd adb_test
git diff HEAD -- Dockerfile docker-compose.yml src/
git status --short
```
