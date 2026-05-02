-- Add 'archived' as a valid pool status
alter table pools drop constraint if exists pools_status_check;
alter table pools add constraint pools_status_check
  check (status in ('draft','open','locked','live','complete','settling','settled','archived'));
