class CreateJobs < ActiveRecord::Migration[7.0]
  def change
    create_table :jobs, id: :uuid do |t|
      t.string :title
      t.string :location
      t.string :status, null: false, default: 'open'
      t.string :job_type, null: false, default: 'full_time'
      t.references :account, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end
    add_index :jobs, :status
    add_index :jobs, :job_type
  end
end