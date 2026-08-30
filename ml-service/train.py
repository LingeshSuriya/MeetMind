import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset

# This is a sample training script that demonstrates how a model like DistilBERT
# could be fine-tuned on a custom dataset of meeting sentences.
# It is not required to run the main MVP, as the MVP uses a zero-shot classifier.

def prepare_dataset(csv_path):
    df = pd.read_csv(csv_path)
    
    # Map labels to integers
    labels = df['label'].unique().tolist()
    label2id = {label: i for i, label in enumerate(labels)}
    id2label = {i: label for i, label in enumerate(labels)}
    
    df['label_id'] = df['label'].map(label2id)
    
    dataset = Dataset.from_pandas(df)
    return dataset, label2id, id2label

def main():
    print("Loading dataset...")
    dataset, label2id, id2label = prepare_dataset("data/training.csv")
    
    print(f"Labels found: {label2id}")
    
    model_name = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True)
        
    tokenized_datasets = dataset.map(tokenize_function, batched=True)
    # Note: We need to rename label_id to labels for PyTorch/HuggingFace Trainer
    tokenized_datasets = tokenized_datasets.rename_column("label_id", "labels")
    
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name, 
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id
    )
    
    training_args = TrainingArguments(
        output_dir="./results",
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        num_train_epochs=3,
        weight_decay=0.01,
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets,
        # In a real scenario, you'd split into train and eval datasets
    )
    
    print("Starting training (simulated)...")
    # Uncomment to actually train:
    # trainer.train()
    # model.save_pretrained("./fine-tuned-model")
    # tokenizer.save_pretrained("./fine-tuned-model")
    print("Training script completed.")

if __name__ == "__main__":
    main()
