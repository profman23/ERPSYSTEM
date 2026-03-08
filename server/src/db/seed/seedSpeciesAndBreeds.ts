/**
 * Species & Breeds Seed Script
 *
 * Idempotent seed: creates species and breeds for a tenant.
 * Safe to run multiple times — checks existence by code before inserting.
 *
 * Usage:
 *   npx tsx src/db/seed/seedSpeciesAndBreeds.ts <tenantId>
 */

import { db } from '../index';
import { eq, and } from 'drizzle-orm';
import { species, breeds } from '../schemas';

// ─── Species Data ────────────────────────────────────────────────────────────

interface SpeciesDef {
  code: string;
  name: string;
  nameAr: string;
  description: string;
}

interface BreedDef {
  code: string;
  name: string;
  nameAr: string;
}

interface SpeciesWithBreeds extends SpeciesDef {
  breeds: BreedDef[];
}

const SPECIES_AND_BREEDS: SpeciesWithBreeds[] = [
  {
    code: 'DOG', name: 'Dog', nameAr: 'كلب', description: 'Domestic dog (Canis lupus familiaris)',
    breeds: [
      { code: 'GOLDEN_RETRIEVER', name: 'Golden Retriever', nameAr: 'جولدن ريتريفر' },
      { code: 'LABRADOR', name: 'Labrador Retriever', nameAr: 'لابرادور ريتريفر' },
      { code: 'GERMAN_SHEPHERD', name: 'German Shepherd', nameAr: 'الراعي الألماني' },
      { code: 'BULLDOG', name: 'Bulldog', nameAr: 'بولدوغ' },
      { code: 'POODLE', name: 'Poodle', nameAr: 'بودل' },
      { code: 'BEAGLE', name: 'Beagle', nameAr: 'بيغل' },
      { code: 'ROTTWEILER', name: 'Rottweiler', nameAr: 'روت وايلر' },
      { code: 'HUSKY', name: 'Siberian Husky', nameAr: 'هاسكي سيبيري' },
      { code: 'CHIHUAHUA', name: 'Chihuahua', nameAr: 'تشيواوا' },
      { code: 'SHIH_TZU', name: 'Shih Tzu', nameAr: 'شيه تزو' },
      { code: 'POMERANIAN', name: 'Pomeranian', nameAr: 'بوميرانيان' },
      { code: 'DACHSHUND', name: 'Dachshund', nameAr: 'داكشهند' },
      { code: 'BOXER', name: 'Boxer', nameAr: 'بوكسر' },
      { code: 'GREAT_DANE', name: 'Great Dane', nameAr: 'الدانماركي الكبير' },
      { code: 'DOBERMAN', name: 'Doberman Pinscher', nameAr: 'دوبرمان' },
      { code: 'BERNESE_MOUNTAIN', name: 'Bernese Mountain Dog', nameAr: 'كلب جبل بيرن' },
      { code: 'BELGIAN_MALINOIS', name: 'Belgian Malinois', nameAr: 'المالينو البلجيكي' },
      { code: 'PIT_BULL', name: 'American Pit Bull Terrier', nameAr: 'بيت بول أمريكي' },
      { code: 'COCKER_SPANIEL', name: 'Cocker Spaniel', nameAr: 'كوكر سبانيل' },
      { code: 'BORDER_COLLIE', name: 'Border Collie', nameAr: 'بوردر كولي' },
      { code: 'DOG_MIXED', name: 'Mixed Breed', nameAr: 'هجين' },
    ],
  },
  {
    code: 'CAT', name: 'Cat', nameAr: 'قط', description: 'Domestic cat (Felis catus)',
    breeds: [
      { code: 'PERSIAN', name: 'Persian', nameAr: 'فارسي' },
      { code: 'SIAMESE', name: 'Siamese', nameAr: 'سيامي' },
      { code: 'MAINE_COON', name: 'Maine Coon', nameAr: 'ماين كون' },
      { code: 'BRITISH_SHORTHAIR', name: 'British Shorthair', nameAr: 'بريطاني قصير الشعر' },
      { code: 'RAGDOLL', name: 'Ragdoll', nameAr: 'راغدول' },
      { code: 'BENGAL', name: 'Bengal', nameAr: 'بنغالي' },
      { code: 'ABYSSINIAN', name: 'Abyssinian', nameAr: 'حبشي' },
      { code: 'SPHYNX', name: 'Sphynx', nameAr: 'سفينكس' },
      { code: 'SCOTTISH_FOLD', name: 'Scottish Fold', nameAr: 'سكوتش فولد' },
      { code: 'RUSSIAN_BLUE', name: 'Russian Blue', nameAr: 'أزرق روسي' },
      { code: 'BIRMAN', name: 'Birman', nameAr: 'بيرمان' },
      { code: 'HIMALAYAN', name: 'Himalayan', nameAr: 'هيمالايا' },
      { code: 'TURKISH_ANGORA', name: 'Turkish Angora', nameAr: 'أنغورا تركي' },
      { code: 'EGYPTIAN_MAU', name: 'Egyptian Mau', nameAr: 'ماو مصري' },
      { code: 'DEVON_REX', name: 'Devon Rex', nameAr: 'ديفون ريكس' },
      { code: 'CAT_MIXED', name: 'Mixed Breed', nameAr: 'هجين' },
    ],
  },
  {
    code: 'BIRD', name: 'Bird', nameAr: 'طائر', description: 'Domestic and pet birds (Aves)',
    breeds: [
      { code: 'BUDGERIGAR', name: 'Budgerigar', nameAr: 'بادجي' },
      { code: 'COCKATIEL', name: 'Cockatiel', nameAr: 'كوكتيل' },
      { code: 'AFRICAN_GREY', name: 'African Grey Parrot', nameAr: 'ببغاء رمادي أفريقي' },
      { code: 'MACAW', name: 'Macaw', nameAr: 'مكاو' },
      { code: 'CANARY', name: 'Canary', nameAr: 'كناري' },
      { code: 'FINCH', name: 'Finch', nameAr: 'فينش' },
      { code: 'LOVEBIRD', name: 'Lovebird', nameAr: 'طائر الحب' },
      { code: 'CONURE', name: 'Conure', nameAr: 'كونيور' },
      { code: 'BIRD_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'RABBIT', name: 'Rabbit', nameAr: 'أرنب', description: 'Domestic rabbit (Oryctolagus cuniculus)',
    breeds: [
      { code: 'HOLLAND_LOP', name: 'Holland Lop', nameAr: 'هولاند لوب' },
      { code: 'MINI_REX', name: 'Mini Rex', nameAr: 'ميني ريكس' },
      { code: 'NETHERLAND_DWARF', name: 'Netherland Dwarf', nameAr: 'هولندي قزم' },
      { code: 'FLEMISH_GIANT', name: 'Flemish Giant', nameAr: 'عملاق فلمنكي' },
      { code: 'LIONHEAD', name: 'Lionhead', nameAr: 'رأس الأسد' },
      { code: 'ENGLISH_LOP', name: 'English Lop', nameAr: 'إنجليزي لوب' },
      { code: 'RABBIT_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'HORSE', name: 'Horse', nameAr: 'حصان', description: 'Domestic horse (Equus caballus)',
    breeds: [
      { code: 'ARABIAN', name: 'Arabian', nameAr: 'عربي أصيل' },
      { code: 'THOROUGHBRED', name: 'Thoroughbred', nameAr: 'ثوروبريد' },
      { code: 'QUARTER_HORSE', name: 'Quarter Horse', nameAr: 'كوارتر هورس' },
      { code: 'APPALOOSA', name: 'Appaloosa', nameAr: 'أبالوسا' },
      { code: 'FRIESIAN', name: 'Friesian', nameAr: 'فريزيان' },
      { code: 'MUSTANG', name: 'Mustang', nameAr: 'موستانغ' },
      { code: 'CLYDESDALE', name: 'Clydesdale', nameAr: 'كلايدسديل' },
      { code: 'HORSE_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'HAMSTER', name: 'Hamster', nameAr: 'هامستر', description: 'Domestic hamster (Cricetinae)',
    breeds: [
      { code: 'SYRIAN_HAMSTER', name: 'Syrian Hamster', nameAr: 'هامستر سوري' },
      { code: 'DWARF_HAMSTER', name: 'Dwarf Hamster', nameAr: 'هامستر قزم' },
      { code: 'ROBOROVSKI', name: 'Roborovski Hamster', nameAr: 'هامستر روبوروفسكي' },
      { code: 'HAMSTER_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'GUINEA_PIG', name: 'Guinea Pig', nameAr: 'خنزير غينيا', description: 'Domestic guinea pig (Cavia porcellus)',
    breeds: [
      { code: 'ABYSSINIAN_GP', name: 'Abyssinian Guinea Pig', nameAr: 'خنزير غينيا حبشي' },
      { code: 'PERUVIAN_GP', name: 'Peruvian Guinea Pig', nameAr: 'خنزير غينيا بيرو' },
      { code: 'AMERICAN_GP', name: 'American Guinea Pig', nameAr: 'خنزير غينيا أمريكي' },
      { code: 'GP_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'FISH', name: 'Fish', nameAr: 'سمكة', description: 'Ornamental and pet fish (Actinopterygii)',
    breeds: [
      { code: 'GOLDFISH', name: 'Goldfish', nameAr: 'سمكة ذهبية' },
      { code: 'BETTA', name: 'Betta Fish', nameAr: 'سمكة بيتا' },
      { code: 'KOI', name: 'Koi', nameAr: 'كوي' },
      { code: 'GUPPY', name: 'Guppy', nameAr: 'جوبي' },
      { code: 'FISH_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'REPTILE', name: 'Reptile', nameAr: 'زاحف', description: 'Reptiles (Reptilia) excluding turtles, snakes, and lizards',
    breeds: [
      { code: 'REPTILE_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'TURTLE', name: 'Turtle', nameAr: 'سلحفاة', description: 'Turtles and tortoises (Testudines)',
    breeds: [
      { code: 'RED_EARED_SLIDER', name: 'Red-Eared Slider', nameAr: 'سلحفاة حمراء الأذن' },
      { code: 'BOX_TURTLE', name: 'Box Turtle', nameAr: 'سلحفاة صندوقية' },
      { code: 'SULCATA_TORTOISE', name: 'Sulcata Tortoise', nameAr: 'سلحفاة سولكاتا' },
      { code: 'TURTLE_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'FERRET', name: 'Ferret', nameAr: 'فرو (نمس)', description: 'Domestic ferret (Mustela putorius furo)',
    breeds: [
      { code: 'FERRET_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'PARROT', name: 'Parrot', nameAr: 'ببغاء', description: 'Parrots (Psittaciformes)',
    breeds: [
      { code: 'COCKATOO', name: 'Cockatoo', nameAr: 'كوكاتو' },
      { code: 'AMAZON_PARROT', name: 'Amazon Parrot', nameAr: 'ببغاء أمازون' },
      { code: 'ECLECTUS', name: 'Eclectus Parrot', nameAr: 'ببغاء إكليكتوس' },
      { code: 'PARROT_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'HEDGEHOG', name: 'Hedgehog', nameAr: 'قنفذ', description: 'Domestic hedgehog (Atelerix albiventris)',
    breeds: [
      { code: 'AFRICAN_PYGMY', name: 'African Pygmy Hedgehog', nameAr: 'قنفذ أفريقي قزم' },
      { code: 'HEDGEHOG_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'SNAKE', name: 'Snake', nameAr: 'ثعبان', description: 'Pet snakes (Serpentes)',
    breeds: [
      { code: 'BALL_PYTHON', name: 'Ball Python', nameAr: 'بايثون كرة' },
      { code: 'CORN_SNAKE', name: 'Corn Snake', nameAr: 'ثعبان الذرة' },
      { code: 'KING_SNAKE', name: 'King Snake', nameAr: 'ثعبان الملك' },
      { code: 'BOA_CONSTRICTOR', name: 'Boa Constrictor', nameAr: 'بوا عاصرة' },
      { code: 'SNAKE_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'LIZARD', name: 'Lizard', nameAr: 'سحلية', description: 'Pet lizards (Lacertilia)',
    breeds: [
      { code: 'BEARDED_DRAGON', name: 'Bearded Dragon', nameAr: 'تنين ملتحي' },
      { code: 'LEOPARD_GECKO', name: 'Leopard Gecko', nameAr: 'وزغ نمري' },
      { code: 'IGUANA', name: 'Green Iguana', nameAr: 'إغوانا خضراء' },
      { code: 'CHAMELEON', name: 'Chameleon', nameAr: 'حرباء' },
      { code: 'LIZARD_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'CHICKEN', name: 'Chicken', nameAr: 'دجاج', description: 'Domestic chicken (Gallus gallus domesticus)',
    breeds: [
      { code: 'LEGHORN', name: 'Leghorn', nameAr: 'ليغهورن' },
      { code: 'RHODE_ISLAND_RED', name: 'Rhode Island Red', nameAr: 'رود آيلاند الأحمر' },
      { code: 'SILKIE', name: 'Silkie', nameAr: 'سيلكي' },
      { code: 'CHICKEN_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'GOAT', name: 'Goat', nameAr: 'ماعز', description: 'Domestic goat (Capra aegagrus hircus)',
    breeds: [
      { code: 'BOER', name: 'Boer Goat', nameAr: 'ماعز بور' },
      { code: 'NUBIAN', name: 'Nubian Goat', nameAr: 'ماعز نوبي' },
      { code: 'PYGMY_GOAT', name: 'Pygmy Goat', nameAr: 'ماعز قزم' },
      { code: 'GOAT_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'SHEEP', name: 'Sheep', nameAr: 'خروف', description: 'Domestic sheep (Ovis aries)',
    breeds: [
      { code: 'MERINO', name: 'Merino', nameAr: 'ميرينو' },
      { code: 'SUFFOLK', name: 'Suffolk', nameAr: 'سوفولك' },
      { code: 'DORPER', name: 'Dorper', nameAr: 'دوربر' },
      { code: 'AWASSI', name: 'Awassi', nameAr: 'عواسي' },
      { code: 'SHEEP_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'COW', name: 'Cow', nameAr: 'بقرة', description: 'Domestic cattle (Bos taurus)',
    breeds: [
      { code: 'HOLSTEIN', name: 'Holstein Friesian', nameAr: 'هولشتاين' },
      { code: 'ANGUS', name: 'Angus', nameAr: 'أنغوس' },
      { code: 'HEREFORD', name: 'Hereford', nameAr: 'هيرفورد' },
      { code: 'JERSEY', name: 'Jersey', nameAr: 'جيرسي' },
      { code: 'COW_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
  {
    code: 'CAMEL', name: 'Camel', nameAr: 'جمل', description: 'Domestic camel (Camelus)',
    breeds: [
      { code: 'DROMEDARY', name: 'Dromedary (Arabian)', nameAr: 'جمل عربي' },
      { code: 'BACTRIAN', name: 'Bactrian Camel', nameAr: 'جمل ذو سنامين' },
      { code: 'CAMEL_MIXED', name: 'Mixed / Unknown', nameAr: 'غير محدد' },
    ],
  },
];

// ─── Seed Function ───────────────────────────────────────────────────────────

interface SeedStats {
  speciesCreated: number;
  speciesSkipped: number;
  breedsCreated: number;
  breedsSkipped: number;
}

export async function seedSpeciesAndBreeds(tenantId: string): Promise<SeedStats> {
  const stats: SeedStats = {
    speciesCreated: 0,
    speciesSkipped: 0,
    breedsCreated: 0,
    breedsSkipped: 0,
  };

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  SPECIES & BREEDS SEED — Tenant: ${tenantId}`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const speciesDef of SPECIES_AND_BREEDS) {
    // Check if species exists
    const existing = await db.select({ id: species.id })
      .from(species)
      .where(and(eq(species.tenantId, tenantId), eq(species.code, speciesDef.code)))
      .limit(1);

    let speciesId: string;

    if (existing.length > 0) {
      speciesId = existing[0].id;
      stats.speciesSkipped++;
      console.log(`  ⏭ Species: ${speciesDef.name} (${speciesDef.code}) — already exists`);
    } else {
      const [created] = await db.insert(species).values({
        tenantId,
        code: speciesDef.code,
        name: speciesDef.name,
        nameAr: speciesDef.nameAr,
        description: speciesDef.description,
      }).returning();
      speciesId = created.id;
      stats.speciesCreated++;
      console.log(`  ✅ Species: ${speciesDef.name} (${speciesDef.code}) — created`);
    }

    // Seed breeds for this species
    for (const breedDef of speciesDef.breeds) {
      const existingBreed = await db.select({ id: breeds.id })
        .from(breeds)
        .where(and(
          eq(breeds.tenantId, tenantId),
          eq(breeds.code, breedDef.code),
        ))
        .limit(1);

      if (existingBreed.length > 0) {
        stats.breedsSkipped++;
      } else {
        await db.insert(breeds).values({
          tenantId,
          speciesId,
          code: breedDef.code,
          name: breedDef.name,
          nameAr: breedDef.nameAr,
        });
        stats.breedsCreated++;
        console.log(`     ✅ Breed: ${breedDef.name} (${breedDef.code})`);
      }
    }
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  Summary:`);
  console.log(`    Species: ${stats.speciesCreated} created, ${stats.speciesSkipped} skipped`);
  console.log(`    Breeds:  ${stats.breedsCreated} created, ${stats.breedsSkipped} skipped`);
  console.log(`${'═'.repeat(70)}\n`);

  return stats;
}

// ─── CLI Runner ──────────────────────────────────────────────────────────────

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: npx tsx src/db/seed/seedSpeciesAndBreeds.ts <tenantId>');
    process.exit(1);
  }

  try {
    await seedSpeciesAndBreeds(tenantId);
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

// Only run CLI when this file is the direct entry point
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('seedSpeciesAndBreeds');
if (isDirectRun) {
  main();
}
