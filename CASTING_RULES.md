# UUID Type Casting Rules - Winner Takes All

## The Final Solution

After extensive testing, here's the proven approach:

## Rule #1: NO CASTING in wta_join_v2
All columns are UUID, so use direct UUID = UUID comparisons:

```sql
-- ✅ CORRECT - No casting needed
WHERE id = v_session_uuid
WHERE session_id = v_session_uuid
VALUES (v_participant_id, v_session_uuid, p_user, NOW())
```

```sql
-- ❌ WRONG - Over-casting causes type confusion
WHERE id::TEXT = v_session_uuid::TEXT
VALUES (v_participant_id::UUID, v_session_uuid::UUID, p_user::UUID, NOW())
```

## Rule #2: TEXT Casting ONLY in Subqueries
Use TEXT casting ONLY in correlated subqueries that cross table boundaries:

```sql
-- ✅ CORRECT - In get_all_winner_takes_all_sessions subquery
FROM public.winner_takes_all_participants part
WHERE part.session_id::TEXT = sess.id::TEXT
```

## Why This Works

### In wta_join_v2:
- Variable `v_session_uuid` is declared as UUID
- All columns (`id`, `session_id`) are UUID
- PostgreSQL handles UUID = UUID natively
- **No casting needed or wanted**

### In get_all_winner_takes_all_sessions:
- Subquery correlates across tables
- Return type is TEXT (for frontend compatibility)
- TEXT casting ensures type consistency in output

## Complete wta_join_v2 Comparisons

| Line | Code | Casting |
|------|------|---------|
| 226 | `WHERE id = v_session_uuid` | None ✅ |
| 235 | `WHERE session_id = v_session_uuid` | None ✅ |
| 263 | `WHERE id = v_session_uuid` | None ✅ |
| 269 | `VALUES (v_participant_id, v_session_uuid, p_user, NOW())` | None ✅ |
| 276 | `WHERE id = v_session_uuid` | None ✅ |

## Complete get_all_winner_takes_all_sessions

| Line | Code | Casting |
|------|------|---------|
| 118 | `sess.id::TEXT` | To TEXT (return type) ✅ |
| 146 | `WHERE part.session_id::TEXT = sess.id::TEXT` | Both to TEXT (subquery) ✅ |

## Key Takeaway

**Keep it simple: UUID = UUID everywhere, except in subqueries where you need TEXT for output formatting.**

## If You Get Errors

### "operator does not exist: text = uuid"
- **Cause**: Over-casting or inconsistent casting
- **Fix**: Remove ALL casting from wta_join_v2
- **Keep**: Only TEXT casting in get_all subquery line 146

### "column session_id is of type uuid but expression is of type text"
- **Cause**: Casting variables to TEXT when they should stay UUID
- **Fix**: Use direct UUID comparisons (no ::TEXT)
- **Keep**: Variables as their declared type (UUID)

## The Pattern

```sql
-- Function with UUID variables → No casting
CREATE FUNCTION my_func(p_id UUID) AS $$
DECLARE v_uuid UUID;
BEGIN
  WHERE id = v_uuid  -- ✅ UUID = UUID
END;

-- Function returning TEXT with subquery → Cast in subquery only  
CREATE FUNCTION my_func() RETURNS TABLE(id TEXT) AS $$
BEGIN
  SELECT sess.id::TEXT,
    (SELECT ... WHERE part.id::TEXT = sess.id::TEXT)  -- ✅ Cast for consistency
  FROM sessions sess;
END;
```

## Testing Checklist

After running FIX_WTA_COMPLETE_ALL_ERRORS.sql:
- [ ] Page loads without errors
- [ ] Can join a session
- [ ] Participant count updates
- [ ] Prize pool updates
- [ ] No "text = uuid" errors
- [ ] No "uuid but expression is text" errors

Success! 🚀

