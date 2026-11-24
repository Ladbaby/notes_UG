## 5.3 `trigger`
A `trigger` is a statement that is executed automatically by the system as a ==side effect of a modification== to the database

比如，我们想让插入操作之后，检查操作是否合理，否则就回滚:
```sql{.line-numbers}
create trigger timeslot_check1 after insert on section
referencing new row as nrow
for each row
when (nrow.time_slot_id not in(
    select time_slot_id
    from time_slot)) /* time_slot_id not present in time_slot */
begin
    rollback
end;
```
