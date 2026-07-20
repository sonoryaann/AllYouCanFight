create table default_dishes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  punti int not null default 1 check (punti >= 1),
  ordine int not null default 0
);
alter table default_dishes enable row level security;
create policy default_dishes_read on default_dishes for select to authenticated using (true);

insert into default_dishes (nome, categoria, punti, ordine) values
('Edamame','Antipasti',1,1),('Zuppa di Miso','Antipasti',1,2),('Insalata di Alghe','Antipasti',1,3),
('Insalata Mista','Antipasti',1,4),('Insalata di Polpo','Antipasti',2,5),('Sunomono','Antipasti',1,6),
('Nigiri Salmone','Nigiri',1,1),('Nigiri Salmone Flambé','Nigiri',2,2),('Nigiri Tonno','Nigiri',2,3),
('Nigiri Tonno Flambé','Nigiri',3,4),('Nigiri Branzino','Nigiri',1,5),('Nigiri Orata','Nigiri',1,6),
('Nigiri Gambero','Nigiri',1,7),('Nigiri Gambero Crudo','Nigiri',2,8),('Nigiri Anguilla','Nigiri',2,9),
('Nigiri Ricciola','Nigiri',3,10),('Nigiri Polpo','Nigiri',2,11),('Nigiri Capasanta','Nigiri',3,12),
('Nigiri Surimi','Nigiri',1,13),('Nigiri Salmone Avocado','Nigiri',2,14),
('Gunkan Salmone','Gunkan',2,1),('Gunkan Tobiko','Gunkan',2,2),('Gunkan Tartare di Salmone','Gunkan',2,3),
('Gunkan Tartare di Tonno','Gunkan',3,4),
('Hosomaki Salmone','Hosomaki',1,1),('Hosomaki Tonno','Hosomaki',1,2),('Hosomaki Cetriolo','Hosomaki',1,3),
('Hosomaki Avocado','Hosomaki',1,4),('Hosomaki Surimi','Hosomaki',1,5),
('Uramaki California','Uramaki',1,1),('Uramaki Salmone Avocado','Uramaki',1,2),('Uramaki Philadelphia','Uramaki',2,3),
('Uramaki Ebiten','Uramaki',2,4),('Uramaki Spicy Tuna','Uramaki',2,5),('Uramaki Spicy Salmon','Uramaki',2,6),
('Uramaki Tonno Avocado','Uramaki',2,7),('Uramaki Vegetariano','Uramaki',1,8),('Uramaki Anguilla Avocado','Uramaki',3,9),
('Uramaki Tempura','Uramaki',2,10),
('Futomaki Vegetariano','Futomaki',2,1),('Futomaki Salmone','Futomaki',2,2),('Futomaki Tempura','Futomaki',3,3),
('Temaki Salmone','Temaki',2,1),('Temaki California','Temaki',2,2),('Temaki Tonno','Temaki',2,3),
('Temaki Gambero Tempura','Temaki',3,4),
('Dragon Roll','Roll Speciali',4,1),('Rainbow Roll','Roll Speciali',4,2),('Spicy Salmon Special','Roll Speciali',3,3),
('Ebiten Special','Roll Speciali',3,4),('Flambé Roll Salmone','Roll Speciali',3,5),('Tuna Tataki Roll','Roll Speciali',4,6),
('Sashimi Salmone','Sashimi',3,1),('Sashimi Tonno','Sashimi',3,2),('Sashimi Branzino','Sashimi',3,3),
('Sashimi Ricciola','Sashimi',4,4),('Sashimi Polpo','Sashimi',3,5),('Sashimi Misto','Sashimi',4,6),
('Tartare di Salmone','Tartare & Tataki',3,1),('Tartare di Tonno','Tartare & Tataki',4,2),
('Tataki di Salmone','Tartare & Tataki',3,3),('Tataki di Tonno','Tartare & Tataki',4,4),
('Poke Salmone','Poke',2,1),('Poke Tonno','Poke',3,2),('Poke Vegetariano','Poke',2,3),('Poke Gambero','Poke',3,4),
('Tempura Gamberi','Fritti',2,1),('Tempura Verdure','Fritti',1,2),('Tempura Mista','Fritti',2,3),
('Gyoza','Fritti',2,4),('Gyoza Verdure','Fritti',2,5),('Chicken Karaage','Fritti',2,6),
('Ebi Fry','Fritti',2,7),('Involtini Primavera','Fritti',1,8),('Salmone Fritto','Fritti',2,9),
('Mochi','Dolci',2,1),('Tempura Banana','Dolci',2,2),('Tempura Gelato','Dolci',3,3),
('Dorayaki','Dolci',2,4),('Gelato Fritto','Dolci',2,5);

create or replace function seed_default_dishes(p_lobby uuid) returns void
language sql security definer set search_path = public as $$
  insert into lobby_dishes (lobby_id, nome, categoria, punti)
  select p_lobby, nome, categoria, punti from default_dishes order by categoria, ordine;
$$;
