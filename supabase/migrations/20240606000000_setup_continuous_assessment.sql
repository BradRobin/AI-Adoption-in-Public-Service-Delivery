-- Function to simulate a continuous background re-assessment
-- It duplicates the user's latest assessment, applying a slight randomized adjustment
-- to their dimension scores and recalculating the overall score.
create or replace function public.simulate_continuous_reassessment()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  user_rec record;
  latest_assessment record;
  new_dim_scores jsonb;
  new_overall int;
  tech_score float;
  org_score float;
  env_score float;
  adj float;
begin
  -- Loop through all users
  for user_rec in select id from auth.users loop
    
    -- Get their latest assessment
    select * into latest_assessment
    from public.assessments
    where user_id = user_rec.id
    order by created_at desc
    limit 1;

    if found then
      -- Extract current dimension scores (assuming 1 to 5 scale)
      tech_score := (latest_assessment.dimension_scores->>'technological')::float;
      org_score := (latest_assessment.dimension_scores->>'organizational')::float;
      env_score := (latest_assessment.dimension_scores->>'environmental')::float;

      -- Apply a random adjustment between -0.2 and +0.3 to simulate progress or regression
      tech_score := least(5.0, greatest(1.0, tech_score + (random() * 0.5 - 0.2)));
      org_score := least(5.0, greatest(1.0, org_score + (random() * 0.5 - 0.2)));
      env_score := least(5.0, greatest(1.0, env_score + (random() * 0.5 - 0.2)));

      -- Rebuild JSONB and compute new overall score (0-100 scale)
      new_dim_scores := jsonb_build_object(
        'technological', tech_score,
        'organizational', org_score,
        'environmental', env_score
      );

      -- overall = (sum / 3) * 20 (since scale is 1-5, max is 5. 5/5 * 100 = 100)
      new_overall := round(((tech_score + org_score + env_score) / 3.0) * 20.0);

      -- Insert the "background check" assessment
      insert into public.assessments (user_id, score, dimension_scores, created_at)
      values (
        latest_assessment.user_id,
        new_overall,
        new_dim_scores,
        latest_assessment.created_at + interval '7 days' -- Simulate time jump
      );
    end if;

  end loop;
end;
$$;
