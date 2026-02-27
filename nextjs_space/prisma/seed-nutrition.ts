import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding nutrition data...');

  // Check if organization exists, create if not
  let organization = await prisma.organization.findUnique({
    where: { slug: 'demo' }
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Demo Organization',
        slug: 'demo',
      }
    });
    console.log('✅ Organization created');
  }

  // Check if patient exists
  let patient = await prisma.patient.findFirst({
    where: { name: 'Alice Martins' }
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        name: 'Alice Martins',
        sex: 'F',
        birthYear: 1970,
        organizationId: organization.id,
      }
    });
    console.log('✅ Patient created');
  }

  // Create sample recipes
  const recipes = [
    {
      name: 'Omelete de Claras com Espinafre',
      description: 'Omelete leve e nutritivo, rico em proteínas e baixo em calorias',
      ingredients: JSON.stringify([
        { name: 'claras de ovo', quantity: '4', unit: 'unidades' },
        { name: 'espinafre', quantity: '1', unit: 'xícara' },
        { name: 'queijo cottage', quantity: '2', unit: 'colheres de sopa' },
        { name: 'sal', quantity: 'a gosto', unit: '' },
        { name: 'azeite', quantity: '1', unit: 'colher de chá' },
      ]),
      instructions: '1. Bata as claras até ficarem levemente espumosas.\n2. Refogue o espinafre rapidamente no azeite.\n3. Despeje as claras na frigideira e adicione o espinafre.\n4. Quando quase pronto, adicione o queijo cottage.\n5. Dobre ao meio e sirva.',
      nutritionalInfo: JSON.stringify({ calories: 180, proteins: 24, carbs: 4, fats: 7, fiber: 2 }),
      category: 'BREAKFAST',
      prepTime: 15,
      servings: 1,
    },
    {
      name: 'Aveia com Frutas Vermelhas',
      description: 'Café da manhã completo com fibras e antioxidantes',
      ingredients: JSON.stringify([
        { name: 'aveia em flocos', quantity: '40', unit: 'g' },
        { name: 'leite desnatado', quantity: '200', unit: 'ml' },
        { name: 'morango', quantity: '5', unit: 'unidades' },
        { name: 'mirtilo', quantity: '30', unit: 'g' },
        { name: 'mel', quantity: '1', unit: 'colher de chá' },
      ]),
      instructions: '1. Cozinhe a aveia com o leite em fogo baixo por 5 minutos.\n2. Transfira para uma tigela.\n3. Adicione as frutas por cima.\n4. Finalize com um fio de mel.',
      nutritionalInfo: JSON.stringify({ calories: 280, proteins: 12, carbs: 45, fats: 5, fiber: 6 }),
      category: 'BREAKFAST',
      prepTime: 10,
      servings: 1,
    },
    {
      name: 'Frango Grelhado com Legumes',
      description: 'Prato principal equilibrado com proteína magra e vegetais',
      ingredients: JSON.stringify([
        { name: 'peito de frango', quantity: '150', unit: 'g' },
        { name: 'brócolis', quantity: '1', unit: 'xícara' },
        { name: 'cenoura', quantity: '1', unit: 'unidade média' },
        { name: 'abobrinha', quantity: '1/2', unit: 'unidade' },
        { name: 'azeite', quantity: '1', unit: 'colher de sopa' },
        { name: 'ervas finas', quantity: 'a gosto', unit: '' },
      ]),
      instructions: '1. Tempere o frango com sal, pimenta e ervas.\n2. Grelhe o frango por 6-7 minutos de cada lado.\n3. Corte os legumes em pedaços médios.\n4. Refogue os legumes no azeite até ficarem al dente.\n5. Sirva o frango fatiado sobre os legumes.',
      nutritionalInfo: JSON.stringify({ calories: 320, proteins: 38, carbs: 15, fats: 12, fiber: 5 }),
      category: 'LUNCH',
      prepTime: 30,
      servings: 1,
    },
    {
      name: 'Salada de Quinoa com Atum',
      description: 'Salada proteica e refrescante',
      ingredients: JSON.stringify([
        { name: 'quinoa cozida', quantity: '1', unit: 'xícara' },
        { name: 'atum em água', quantity: '1', unit: 'lata (120g)' },
        { name: 'tomate cereja', quantity: '8', unit: 'unidades' },
        { name: 'pepino', quantity: '1/2', unit: 'unidade' },
        { name: 'azeite', quantity: '1', unit: 'colher de sopa' },
        { name: 'limão', quantity: '1/2', unit: 'unidade' },
      ]),
      instructions: '1. Cozinhe a quinoa conforme instruções da embalagem e deixe esfriar.\n2. Escorra o atum.\n3. Pique os vegetais em cubos.\n4. Misture todos os ingredientes.\n5. Tempere com azeite, limão e sal.',
      nutritionalInfo: JSON.stringify({ calories: 380, proteins: 32, carbs: 35, fats: 14, fiber: 5 }),
      category: 'LUNCH',
      prepTime: 25,
      servings: 1,
    },
    {
      name: 'Salmão ao Forno com Aspargos',
      description: 'Jantar sofisticado rico em ômega-3',
      ingredients: JSON.stringify([
        { name: 'filé de salmão', quantity: '150', unit: 'g' },
        { name: 'aspargos', quantity: '6', unit: 'unidades' },
        { name: 'limão siciliano', quantity: '1/2', unit: 'unidade' },
        { name: 'azeite', quantity: '1', unit: 'colher de sopa' },
        { name: 'alho', quantity: '1', unit: 'dente' },
        { name: 'dill fresco', quantity: 'a gosto', unit: '' },
      ]),
      instructions: '1. Pré-aqueça o forno a 200°C.\n2. Disponha o salmão e os aspargos em uma assadeira.\n3. Regue com azeite e suco de limão.\n4. Adicione o alho picado e o dill.\n5. Asse por 15-18 minutos.',
      nutritionalInfo: JSON.stringify({ calories: 350, proteins: 35, carbs: 8, fats: 20, fiber: 3 }),
      category: 'DINNER',
      prepTime: 25,
      servings: 1,
    },
    {
      name: 'Sopa de Legumes com Frango Desfiado',
      description: 'Jantar leve e reconfortante',
      ingredients: JSON.stringify([
        { name: 'frango desfiado', quantity: '100', unit: 'g' },
        { name: 'caldo de legumes', quantity: '500', unit: 'ml' },
        { name: 'cenoura', quantity: '1', unit: 'unidade' },
        { name: 'abobrinha', quantity: '1', unit: 'unidade' },
        { name: 'cebola', quantity: '1/2', unit: 'unidade' },
        { name: 'salsinha', quantity: 'a gosto', unit: '' },
      ]),
      instructions: '1. Refogue a cebola picada.\n2. Adicione os legumes em cubos e o caldo.\n3. Cozinhe por 15 minutos.\n4. Adicione o frango desfiado.\n5. Finalize com salsinha picada.',
      nutritionalInfo: JSON.stringify({ calories: 220, proteins: 25, carbs: 18, fats: 6, fiber: 4 }),
      category: 'DINNER',
      prepTime: 30,
      servings: 1,
    },
    {
      name: 'Iogurte com Granola e Banana',
      description: 'Lanche nutritivo e prático',
      ingredients: JSON.stringify([
        { name: 'iogurte natural desnatado', quantity: '170', unit: 'g' },
        { name: 'granola sem açúcar', quantity: '30', unit: 'g' },
        { name: 'banana', quantity: '1/2', unit: 'unidade' },
        { name: 'canela', quantity: 'a gosto', unit: '' },
      ]),
      instructions: '1. Coloque o iogurte em uma tigela.\n2. Fatie a banana por cima.\n3. Adicione a granola.\n4. Polvilhe canela a gosto.',
      nutritionalInfo: JSON.stringify({ calories: 200, proteins: 10, carbs: 32, fats: 4, fiber: 3 }),
      category: 'SNACK',
      prepTime: 5,
      servings: 1,
    },
    {
      name: 'Mix de Castanhas e Frutas Secas',
      description: 'Lanche energético para o dia a dia',
      ingredients: JSON.stringify([
        { name: 'castanha de caju', quantity: '5', unit: 'unidades' },
        { name: 'amêndoas', quantity: '5', unit: 'unidades' },
        { name: 'nozes', quantity: '3', unit: 'unidades' },
        { name: 'damasco seco', quantity: '2', unit: 'unidades' },
        { name: 'uva passa', quantity: '1', unit: 'colher de sopa' },
      ]),
      instructions: '1. Misture todas as castanhas e frutas secas.\n2. Armazene em um pote hermético.\n3. Consuma como lanche entre as refeições.',
      nutritionalInfo: JSON.stringify({ calories: 180, proteins: 5, carbs: 15, fats: 12, fiber: 2 }),
      category: 'SNACK',
      prepTime: 2,
      servings: 1,
    },
  ];

  // Create recipes
  const createdRecipes: any[] = [];
  for (const recipe of recipes) {
    const existing = await prisma.recipe.findFirst({
      where: { name: recipe.name }
    });
    
    if (!existing) {
      const created = await prisma.recipe.create({ data: recipe });
      createdRecipes.push(created);
    } else {
      createdRecipes.push(existing);
    }
  }
  console.log(`✅ ${createdRecipes.length} recipes ready`);

  // Create substitutions (similar recipes can substitute each other)
  const substitutionPairs = [
    { original: 'Omelete de Claras com Espinafre', substitute: 'Aveia com Frutas Vermelhas', reason: 'Opção vegetariana' },
    { original: 'Frango Grelhado com Legumes', substitute: 'Salada de Quinoa com Atum', reason: 'Opção sem carne vermelha' },
    { original: 'Salmão ao Forno com Aspargos', substitute: 'Sopa de Legumes com Frango Desfiado', reason: 'Opção mais leve' },
    { original: 'Iogurte com Granola e Banana', substitute: 'Mix de Castanhas e Frutas Secas', reason: 'Opção sem laticínios' },
  ];

  for (const pair of substitutionPairs) {
    const original = createdRecipes.find(r => r.name === pair.original);
    const substitute = createdRecipes.find(r => r.name === pair.substitute);
    
    if (original && substitute) {
      const exists = await prisma.recipeSubstitution.findFirst({
        where: {
          originalRecipeId: original.id,
          substituteRecipeId: substitute.id,
        }
      });
      
      if (!exists) {
        await prisma.recipeSubstitution.create({
          data: {
            originalRecipeId: original.id,
            substituteRecipeId: substitute.id,
            reason: pair.reason,
          }
        });
      }
    }
  }
  console.log('✅ Recipe substitutions created');

  // Create a sample meal plan
  const existingMealPlan = await prisma.mealPlan.findFirst({
    where: { patientId: patient.id }
  });

  if (!existingMealPlan) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // End of week (Saturday)

    const mealPlan = await prisma.mealPlan.create({
      data: {
        patientId: patient.id,
        startDate,
        endDate,
        notes: 'Cardápio focado em perda de gordura com manutenção de massa muscular',
        status: 'ACTIVE',
      }
    });

    // Add recipes to meal plan
    const mealPlanRecipes = [
      // Sunday
      { recipeIndex: 0, dayOfWeek: 0, mealType: 'BREAKFAST' },
      { recipeIndex: 2, dayOfWeek: 0, mealType: 'LUNCH' },
      { recipeIndex: 4, dayOfWeek: 0, mealType: 'DINNER' },
      { recipeIndex: 6, dayOfWeek: 0, mealType: 'SNACK' },
      // Monday
      { recipeIndex: 1, dayOfWeek: 1, mealType: 'BREAKFAST' },
      { recipeIndex: 3, dayOfWeek: 1, mealType: 'LUNCH' },
      { recipeIndex: 5, dayOfWeek: 1, mealType: 'DINNER' },
      { recipeIndex: 7, dayOfWeek: 1, mealType: 'SNACK' },
      // Tuesday
      { recipeIndex: 0, dayOfWeek: 2, mealType: 'BREAKFAST' },
      { recipeIndex: 2, dayOfWeek: 2, mealType: 'LUNCH' },
      { recipeIndex: 4, dayOfWeek: 2, mealType: 'DINNER' },
      { recipeIndex: 6, dayOfWeek: 2, mealType: 'SNACK' },
      // Wednesday
      { recipeIndex: 1, dayOfWeek: 3, mealType: 'BREAKFAST' },
      { recipeIndex: 3, dayOfWeek: 3, mealType: 'LUNCH' },
      { recipeIndex: 5, dayOfWeek: 3, mealType: 'DINNER' },
      { recipeIndex: 7, dayOfWeek: 3, mealType: 'SNACK' },
      // Thursday
      { recipeIndex: 0, dayOfWeek: 4, mealType: 'BREAKFAST' },
      { recipeIndex: 2, dayOfWeek: 4, mealType: 'LUNCH' },
      { recipeIndex: 4, dayOfWeek: 4, mealType: 'DINNER' },
      { recipeIndex: 6, dayOfWeek: 4, mealType: 'SNACK' },
      // Friday
      { recipeIndex: 1, dayOfWeek: 5, mealType: 'BREAKFAST' },
      { recipeIndex: 3, dayOfWeek: 5, mealType: 'LUNCH' },
      { recipeIndex: 5, dayOfWeek: 5, mealType: 'DINNER' },
      { recipeIndex: 7, dayOfWeek: 5, mealType: 'SNACK' },
      // Saturday
      { recipeIndex: 0, dayOfWeek: 6, mealType: 'BREAKFAST' },
      { recipeIndex: 2, dayOfWeek: 6, mealType: 'LUNCH' },
      { recipeIndex: 4, dayOfWeek: 6, mealType: 'DINNER' },
      { recipeIndex: 6, dayOfWeek: 6, mealType: 'SNACK' },
    ];

    for (const mpr of mealPlanRecipes) {
      await prisma.mealPlanRecipe.create({
        data: {
          mealPlanId: mealPlan.id,
          recipeId: createdRecipes[mpr.recipeIndex].id,
          dayOfWeek: mpr.dayOfWeek,
          mealType: mpr.mealType,
          portion: 1,
        }
      });
    }
    console.log('✅ Sample meal plan created with recipes');
  } else {
    console.log('ℹ️ Meal plan already exists');
  }

  console.log('\n🎉 Nutrition seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
