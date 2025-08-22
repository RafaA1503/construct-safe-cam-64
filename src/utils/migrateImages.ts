import { supabase } from "@/integrations/supabase/client";

export const migrateLocalImagesToSupabase = async () => {
  try {
    const savedImages = localStorage.getItem("captured_images");
    if (!savedImages) {
      console.log("No hay imágenes en localStorage para migrar");
      return { success: true, migrated: 0 };
    }

    const localImages = JSON.parse(savedImages);
    console.log(`📦 Encontradas ${localImages.length} imágenes en localStorage`);

    let migratedCount = 0;

    for (const image of localImages) {
      try {
        // Check if image already exists in database
        const { data: existingImage } = await supabase
          .from('captured_images')
          .select('id')
          .eq('id', image.id)
          .single();

        if (existingImage) {
          console.log(`⏭️ Imagen ${image.id} ya existe en la base de datos`);
          continue;
        }

        // For base64 images, we need to upload them to storage first
        if (image.url.startsWith('data:image')) {
          // Convert base64 to blob
          const base64Data = image.url.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });

          // Upload to storage
          const fileName = `migrated_${image.id}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('epp-images')
            .upload(fileName, blob);

          if (uploadError) {
            console.error(`❌ Error subiendo imagen ${image.id}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('epp-images')
            .getPublicUrl(fileName);

          image.url = publicUrl;
        }

        // Insert into database
        const { error: dbError } = await supabase
          .from('captured_images')
          .insert({
            id: image.id,
            url: image.url,
            detections: image.detections || [],
            confidence: image.confidence || 0,
            is_protected: false,
            user_id: null,
            timestamp: image.timestamp
          });

        if (dbError) {
          console.error(`❌ Error guardando imagen ${image.id} en BD:`, dbError);
        } else {
          migratedCount++;
          console.log(`✅ Imagen ${image.id} migrada exitosamente`);
        }
      } catch (error) {
        console.error(`❌ Error procesando imagen ${image.id}:`, error);
      }
    }

    console.log(`🎉 Migración completada: ${migratedCount} imágenes migradas`);
    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error("❌ Error en migración:", error);
    return { success: false, error };
  }
};