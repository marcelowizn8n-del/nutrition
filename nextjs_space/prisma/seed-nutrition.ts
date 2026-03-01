import { PrismaClient, RecipeCategory, MealType } from '@prisma/client';

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
      category: RecipeCategory.BREAKFAST,
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
      category: RecipeCategory.BREAKFAST,
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
      category: RecipeCategory.LUNCH,
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
      category: RecipeCategory.LUNCH,
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
      category: RecipeCategory.DINNER,
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
      category: RecipeCategory.DINNER,
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
      category: RecipeCategory.SNACK,
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
      category: RecipeCategory.SNACK,
      prepTime: 2,
      servings: 1,
    },
    // === NOVAS RECEITAS SAUDÁVEIS ===
    {
      name: 'Smoothie Verde Detox',
      description: 'Bebida refrescante rica em vitaminas e minerais',
      ingredients: JSON.stringify([
        { name: 'couve', quantity: '2', unit: 'folhas' },
        { name: 'maçã verde', quantity: '1', unit: 'unidade' },
        { name: 'gengibre', quantity: '1', unit: 'cm' },
        { name: 'limão', quantity: '1/2', unit: 'unidade' },
        { name: 'água de coco', quantity: '200', unit: 'ml' },
        { name: 'hortelã', quantity: '5', unit: 'folhas' },
      ]),
      instructions: '1. Lave bem todos os ingredientes.\n2. Pique a maçã e a couve.\n3. Coloque tudo no liquidificador.\n4. Bata até ficar homogêneo.\n5. Sirva gelado.',
      nutritionalInfo: JSON.stringify({ calories: 95, proteins: 2, carbs: 22, fats: 0, fiber: 4 }),
      category: RecipeCategory.BREAKFAST,
      prepTime: 5,
      servings: 1,
    },
    {
      name: 'Wrap Integral de Frango',
      description: 'Opção prática e saudável para o almoço',
      ingredients: JSON.stringify([
        { name: 'tortilha integral', quantity: '1', unit: 'unidade' },
        { name: 'peito de frango grelhado', quantity: '100', unit: 'g' },
        { name: 'alface americana', quantity: '2', unit: 'folhas' },
        { name: 'tomate', quantity: '2', unit: 'fatias' },
        { name: 'cottage', quantity: '2', unit: 'colheres de sopa' },
        { name: 'mostarda', quantity: '1', unit: 'colher de chá' },
      ]),
      instructions: '1. Passe a mostarda na tortilha.\n2. Distribua o cottage.\n3. Coloque o frango fatiado.\n4. Adicione a alface e o tomate.\n5. Enrole e corte ao meio.',
      nutritionalInfo: JSON.stringify({ calories: 320, proteins: 32, carbs: 25, fats: 10, fiber: 4 }),
      category: RecipeCategory.LUNCH,
      prepTime: 10,
      servings: 1,
    },
    {
      name: 'Bowl de Açaí Fitness',
      description: 'Pré-treino energético e nutritivo',
      ingredients: JSON.stringify([
        { name: 'polpa de açaí sem açúcar', quantity: '100', unit: 'g' },
        { name: 'banana congelada', quantity: '1', unit: 'unidade' },
        { name: 'whey protein', quantity: '1', unit: 'scoop' },
        { name: 'granola', quantity: '2', unit: 'colheres de sopa' },
        { name: 'chia', quantity: '1', unit: 'colher de chá' },
      ]),
      instructions: '1. Bata o açaí com a banana e o whey.\n2. Despeje em uma tigela.\n3. Adicione a granola e chia por cima.\n4. Consuma imediatamente.',
      nutritionalInfo: JSON.stringify({ calories: 380, proteins: 25, carbs: 45, fats: 12, fiber: 7 }),
      category: RecipeCategory.SNACK,
      prepTime: 5,
      servings: 1,
    },
    {
      name: 'Peixe Grelhado com Purê de Couve-flor',
      description: 'Jantar low-carb rico em proteínas',
      ingredients: JSON.stringify([
        { name: 'filé de tilápia', quantity: '150', unit: 'g' },
        { name: 'couve-flor', quantity: '200', unit: 'g' },
        { name: 'alho', quantity: '2', unit: 'dentes' },
        { name: 'azeite', quantity: '1', unit: 'colher de sopa' },
        { name: 'sal e pimenta', quantity: 'a gosto', unit: '' },
        { name: 'salsinha', quantity: '1', unit: 'colher de sopa' },
      ]),
      instructions: '1. Cozinhe a couve-flor até ficar macia.\n2. Amasse e tempere com sal e azeite.\n3. Tempere o peixe e grelhe por 4 min cada lado.\n4. Sirva o peixe sobre o purê.',
      nutritionalInfo: JSON.stringify({ calories: 260, proteins: 35, carbs: 10, fats: 10, fiber: 4 }),
      category: RecipeCategory.DINNER,
      prepTime: 25,
      servings: 1,
    },
    {
      name: 'Tapioca Recheada com Ovo e Queijo',
      description: 'Café da manhã brasileiro sem glúten',
      ingredients: JSON.stringify([
        { name: 'goma de tapioca', quantity: '3', unit: 'colheres de sopa' },
        { name: 'ovo', quantity: '1', unit: 'unidade' },
        { name: 'queijo branco', quantity: '30', unit: 'g' },
        { name: 'orégano', quantity: 'a gosto', unit: '' },
      ]),
      instructions: '1. Espalhe a tapioca na frigideira quente.\n2. Quando formar a massa, vire.\n3. Adicione o queijo fatiado.\n4. Faça um ovo mexido e coloque dentro.\n5. Dobre e sirva.',
      nutritionalInfo: JSON.stringify({ calories: 280, proteins: 15, carbs: 30, fats: 10, fiber: 0 }),
      category: RecipeCategory.BREAKFAST,
      prepTime: 10,
      servings: 1,
    },
    {
      name: 'Salada Caesar Light',
      description: 'Versão saudável do clássico',
      ingredients: JSON.stringify([
        { name: 'alface romana', quantity: '1', unit: 'pé' },
        { name: 'peito de frango grelhado', quantity: '100', unit: 'g' },
        { name: 'parmesão', quantity: '20', unit: 'g' },
        { name: 'iogurte natural', quantity: '3', unit: 'colheres de sopa' },
        { name: 'limão', quantity: '1/2', unit: 'unidade' },
        { name: 'mostarda', quantity: '1', unit: 'colher de chá' },
      ]),
      instructions: '1. Lave e rasgue a alface.\n2. Misture iogurte, limão e mostarda para o molho.\n3. Fatie o frango e disponha sobre a alface.\n4. Regue com o molho.\n5. Finalize com parmesão ralado.',
      nutritionalInfo: JSON.stringify({ calories: 290, proteins: 30, carbs: 12, fats: 14, fiber: 3 }),
      category: RecipeCategory.LUNCH,
      prepTime: 15,
      servings: 1,
    },
    {
      name: 'Bolinho de Arroz Integral com Legumes',
      description: 'Lanche salgado para toda a família',
      ingredients: JSON.stringify([
        { name: 'arroz integral cozido', quantity: '1', unit: 'xícara' },
        { name: 'cenoura ralada', quantity: '2', unit: 'colheres de sopa' },
        { name: 'salsinha', quantity: '2', unit: 'colheres de sopa' },
        { name: 'ovo', quantity: '1', unit: 'unidade' },
        { name: 'farinha de aveia', quantity: '2', unit: 'colheres de sopa' },
      ]),
      instructions: '1. Misture todos os ingredientes.\n2. Modele bolinhos.\n3. Asse a 180°C por 20 minutos.\n4. Vire na metade do tempo.',
      nutritionalInfo: JSON.stringify({ calories: 160, proteins: 6, carbs: 28, fats: 3, fiber: 3 }),
      category: RecipeCategory.SNACK,
      prepTime: 30,
      servings: 4,
    },
    {
      name: 'Carne Moída com Legumes ao Forno',
      description: 'Prato completo e reconfortante',
      ingredients: JSON.stringify([
        { name: 'patinho moído', quantity: '150', unit: 'g' },
        { name: 'abobrinha', quantity: '1', unit: 'unidade' },
        { name: 'berinjela', quantity: '1/2', unit: 'unidade' },
        { name: 'tomate', quantity: '2', unit: 'unidades' },
        { name: 'cebola', quantity: '1', unit: 'unidade' },
        { name: 'azeite', quantity: '1', unit: 'colher de sopa' },
      ]),
      instructions: '1. Refogue a carne com a cebola.\n2. Corte os legumes em rodelas.\n3. Monte camadas em refratário.\n4. Regue com azeite.\n5. Asse a 180°C por 30 minutos.',
      nutritionalInfo: JSON.stringify({ calories: 310, proteins: 28, carbs: 18, fats: 15, fiber: 5 }),
      category: RecipeCategory.DINNER,
      prepTime: 45,
      servings: 1,
    },
    {
      name: 'Panqueca de Banana e Aveia',
      description: 'Café da manhã doce e saudável',
      ingredients: JSON.stringify([
        { name: 'banana madura', quantity: '1', unit: 'unidade' },
        { name: 'ovo', quantity: '1', unit: 'unidade' },
        { name: 'aveia em flocos', quantity: '3', unit: 'colheres de sopa' },
        { name: 'canela', quantity: 'a gosto', unit: '' },
        { name: 'mel', quantity: '1', unit: 'colher de chá' },
      ]),
      instructions: '1. Amasse a banana.\n2. Misture com ovo e aveia.\n3. Faça panquecas em frigideira antiaderente.\n4. Finalize com canela e mel.',
      nutritionalInfo: JSON.stringify({ calories: 250, proteins: 10, carbs: 40, fats: 6, fiber: 4 }),
      category: RecipeCategory.BREAKFAST,
      prepTime: 10,
      servings: 1,
    },
    {
      name: 'Risoto de Quinoa com Cogumelos',
      description: 'Versão proteica e sem glúten do risoto tradicional',
      ingredients: JSON.stringify([
        { name: 'quinoa', quantity: '1', unit: 'xícara' },
        { name: 'cogumelos paris', quantity: '150', unit: 'g' },
        { name: 'caldo de legumes', quantity: '500', unit: 'ml' },
        { name: 'cebola', quantity: '1/2', unit: 'unidade' },
        { name: 'alho', quantity: '2', unit: 'dentes' },
        { name: 'azeite', quantity: '1', unit: 'colher de sopa' },
        { name: 'parmesão', quantity: '30', unit: 'g' },
      ]),
      instructions: '1. Refogue alho e cebola no azeite.\n2. Adicione os cogumelos fatiados.\n3. Acrescente a quinoa e o caldo aos poucos.\n4. Cozinhe mexendo até absorver.\n5. Finalize com parmesão.',
      nutritionalInfo: JSON.stringify({ calories: 380, proteins: 16, carbs: 48, fats: 14, fiber: 6 }),
      category: RecipeCategory.LUNCH,
      prepTime: 35,
      servings: 2,
    },
    {
      name: 'Palitinhos de Cenoura com Hummus',
      description: 'Lanche vegetariano rico em fibras',
      ingredients: JSON.stringify([
        { name: 'cenoura', quantity: '2', unit: 'unidades' },
        { name: 'grão de bico cozido', quantity: '1', unit: 'xícara' },
        { name: 'tahine', quantity: '2', unit: 'colheres de sopa' },
        { name: 'limão', quantity: '1', unit: 'unidade' },
        { name: 'alho', quantity: '1', unit: 'dente' },
        { name: 'azeite', quantity: '2', unit: 'colheres de sopa' },
      ]),
      instructions: '1. Bata o grão de bico com tahine, limão, alho e azeite.\n2. Corte as cenouras em palitos.\n3. Sirva os palitos com o hummus para mergulhar.',
      nutritionalInfo: JSON.stringify({ calories: 220, proteins: 8, carbs: 25, fats: 10, fiber: 7 }),
      category: RecipeCategory.SNACK,
      prepTime: 15,
      servings: 2,
    },
    {
      name: 'Filé Mignon Grelhado com Rúcula',
      description: 'Proteína de alta qualidade com salada',
      ingredients: JSON.stringify([
        { name: 'filé mignon', quantity: '150', unit: 'g' },
        { name: 'rúcula', quantity: '2', unit: 'xícaras' },
        { name: 'tomate cereja', quantity: '6', unit: 'unidades' },
        { name: 'parmesão lascado', quantity: '20', unit: 'g' },
        { name: 'aceto balsâmico', quantity: '1', unit: 'colher de sopa' },
        { name: 'azeite', quantity: '1', unit: 'colher de sopa' },
      ]),
      instructions: '1. Tempere o filé com sal e pimenta.\n2. Grelhe a gosto.\n3. Monte a salada com rúcula e tomates.\n4. Fatie o filé e coloque sobre a salada.\n5. Finalize com parmesão e balsâmico.',
      nutritionalInfo: JSON.stringify({ calories: 350, proteins: 35, carbs: 8, fats: 20, fiber: 2 }),
      category: RecipeCategory.DINNER,
      prepTime: 20,
      servings: 1,
    },
    {
      name: 'Overnight Oats com Chia',
      description: 'Café da manhã preparado na noite anterior',
      ingredients: JSON.stringify([
        { name: 'aveia em flocos', quantity: '4', unit: 'colheres de sopa' },
        { name: 'chia', quantity: '1', unit: 'colher de sopa' },
        { name: 'leite vegetal', quantity: '150', unit: 'ml' },
        { name: 'iogurte natural', quantity: '2', unit: 'colheres de sopa' },
        { name: 'mel', quantity: '1', unit: 'colher de chá' },
        { name: 'frutas variadas', quantity: 'a gosto', unit: '' },
      ]),
      instructions: '1. Misture aveia, chia, leite e iogurte.\n2. Deixe na geladeira de um dia para o outro.\n3. Na manhã seguinte, adicione mel e frutas.',
      nutritionalInfo: JSON.stringify({ calories: 300, proteins: 12, carbs: 42, fats: 10, fiber: 8 }),
      category: RecipeCategory.BREAKFAST,
      prepTime: 5,
      servings: 1,
    },
    {
      name: 'Escondidinho de Frango com Batata Doce',
      description: 'Versão saudável do prato tradicional',
      ingredients: JSON.stringify([
        { name: 'batata doce', quantity: '300', unit: 'g' },
        { name: 'frango desfiado', quantity: '200', unit: 'g' },
        { name: 'cebola', quantity: '1', unit: 'unidade' },
        { name: 'tomate', quantity: '1', unit: 'unidade' },
        { name: 'requeijão light', quantity: '2', unit: 'colheres de sopa' },
        { name: 'queijo mussarela light', quantity: '50', unit: 'g' },
      ]),
      instructions: '1. Cozinhe a batata doce e amasse.\n2. Refogue o frango com cebola e tomate.\n3. Monte camadas em refratário.\n4. Cubra com mussarela.\n5. Gratine no forno.',
      nutritionalInfo: JSON.stringify({ calories: 420, proteins: 35, carbs: 45, fats: 12, fiber: 5 }),
      category: RecipeCategory.DINNER,
      prepTime: 40,
      servings: 2,
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
      { recipeIndex: 0, dayOfWeek: 0, mealType: MealType.BREAKFAST },
      { recipeIndex: 2, dayOfWeek: 0, mealType: MealType.LUNCH },
      { recipeIndex: 4, dayOfWeek: 0, mealType: MealType.DINNER },
      { recipeIndex: 6, dayOfWeek: 0, mealType: MealType.SNACK },
      // Monday
      { recipeIndex: 1, dayOfWeek: 1, mealType: MealType.BREAKFAST },
      { recipeIndex: 3, dayOfWeek: 1, mealType: MealType.LUNCH },
      { recipeIndex: 5, dayOfWeek: 1, mealType: MealType.DINNER },
      { recipeIndex: 7, dayOfWeek: 1, mealType: MealType.SNACK },
      // Tuesday
      { recipeIndex: 0, dayOfWeek: 2, mealType: MealType.BREAKFAST },
      { recipeIndex: 2, dayOfWeek: 2, mealType: MealType.LUNCH },
      { recipeIndex: 4, dayOfWeek: 2, mealType: MealType.DINNER },
      { recipeIndex: 6, dayOfWeek: 2, mealType: MealType.SNACK },
      // Wednesday
      { recipeIndex: 1, dayOfWeek: 3, mealType: MealType.BREAKFAST },
      { recipeIndex: 3, dayOfWeek: 3, mealType: MealType.LUNCH },
      { recipeIndex: 5, dayOfWeek: 3, mealType: MealType.DINNER },
      { recipeIndex: 7, dayOfWeek: 3, mealType: MealType.SNACK },
      // Thursday
      { recipeIndex: 0, dayOfWeek: 4, mealType: MealType.BREAKFAST },
      { recipeIndex: 2, dayOfWeek: 4, mealType: MealType.LUNCH },
      { recipeIndex: 4, dayOfWeek: 4, mealType: MealType.DINNER },
      { recipeIndex: 6, dayOfWeek: 4, mealType: MealType.SNACK },
      // Friday
      { recipeIndex: 1, dayOfWeek: 5, mealType: MealType.BREAKFAST },
      { recipeIndex: 3, dayOfWeek: 5, mealType: MealType.LUNCH },
      { recipeIndex: 5, dayOfWeek: 5, mealType: MealType.DINNER },
      { recipeIndex: 7, dayOfWeek: 5, mealType: MealType.SNACK },
      // Saturday
      { recipeIndex: 0, dayOfWeek: 6, mealType: MealType.BREAKFAST },
      { recipeIndex: 2, dayOfWeek: 6, mealType: MealType.LUNCH },
      { recipeIndex: 4, dayOfWeek: 6, mealType: MealType.DINNER },
      { recipeIndex: 6, dayOfWeek: 6, mealType: MealType.SNACK },
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
