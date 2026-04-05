# Kinship EHR — Development Processes

## Environments

| Abbreviation | Environment | URL | Vercel Project | Vercel Config |
|-------------|-------------|-----|----------------|---------------|
| KS | Staging | kinshipehr.vercel.app | kinship_ehr | `.vercel/project.json.staging` |
| KP | Production | kinshipehr.com | kinship | `.vercel/project.json.prod` |

## Deployment Workflow

### Automated (WorkBot)
1. Poller picks up Jarvis-assigned tasks from Project Tracker
2. Claude Code implements changes in `~/projects/kinship`
3. Deploys to **KS (staging)** automatically
4. Sends Telegram notification with "(deployed to staging)"
5. Chris reviews on kinshipehr.vercel.app
6. If good → promote to production (see below)
7. If issues → create/update task in Project Tracker for fixes

### Manual Deploy to Staging
```bash
cd ~/projects/kinship
cp .vercel/project.json.staging .vercel/project.json
vercel --prod --yes
cp .vercel/project.json.prod .vercel/project.json
```

### Promote Staging to Production
```bash
cd ~/projects/kinship
vercel --prod --yes
```
(Uses the default `.vercel/project.json` which points to production)

### Direct Deploy to Production (bypass staging)
Only for urgent fixes:
```bash
cd ~/projects/kinship
vercel --prod --yes
```

## WorkBot (Automated Task Runner)

### How It Works
- Bun script at `~/.claude/scripts/workbot (task-poller).ts`
- Runs every 5 minutes via macOS crontab
- Queries Supabase for tasks assigned to "Jarvis" with status "todo"
- Picks highest priority first, oldest within same priority
- Launches Claude Code in `--bare` mode with dedicated API key

### Supported Projects
| Project | Project Tracker ID | Working Directory | Deploy Target |
|---------|-------------------|-------------------|---------------|
| Project Tracker | `623e29e8-...` | `~/projects/project-tracker` | Production |
| Kinship EHR | `be78289a-...` | `~/projects/kinship` | Staging |

### Task Lifecycle
1. **todo** + assigned to Jarvis → poller picks it up
2. **inprogress** → poller is working on it
3. **done** → completed, description updated with summary of changes
4. If failed → reassigned to **Chris** with failure reason/questions in description
5. Chris updates description, reassigns to Jarvis → retry on next cycle

### Telegram Notifications
- Starting: "🔧 Starting work on: [title] — Project: [name] · Priority: [priority]"
- Completed: "✅ Completed: [title] — [project] (deployed to staging)"
- Failed: "❌ Needs input: [title] — [reason + questions]"

## Code Review Process

### For Automated Changes
1. Review completed task description in Project Tracker for summary
2. Check staging URL for visual/functional verification
3. Check `git log` for commit details if needed
4. Promote to production when satisfied

### For Manual Changes
1. Make changes locally
2. Run `npm run build` to verify
3. Deploy to staging first
4. Review on kinshipehr.vercel.app
5. Promote to production

## Bug Reporting
1. Create task in Project Tracker under the relevant project
2. Include: steps to reproduce, expected behavior, actual behavior
3. Assign to Jarvis for automated fix, or Chris for manual investigation
4. Failed tasks get reassigned to Chris with questions if more context needed

## Environment Variables
- Managed via Vercel CLI: `vercel env ls`, `vercel env add`
- Local: `.env.local` (not committed)
- Both KS and KP share the same Supabase and Clerk instances
- Separate env vars must be added to BOTH Vercel projects when changed

## Monitoring
- **Claude Code Dashboard**: `http://localhost:3131` — session activity, API usage, agent status
- **WorkBot Log**: `~/.claude/scripts/workbot (task-poller).log`
- **Telegram**: real-time notifications for task start/complete/fail
